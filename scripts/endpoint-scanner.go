package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// EndpointInfo represents information about a backend API endpoint
type EndpointInfo struct {
	Path         string   `json:"path"`
	Methods      []string `json:"methods"`
	Handler      string   `json:"handler"`
	Module       string   `json:"module"`
	Protected    bool     `json:"protected"`
	File         string   `json:"file"`
	FunctionName string   `json:"function_name"`
	LineNumber   int      `json:"line_number"`
	Description  string   `json:"description"`
	Parameters   []string `json:"parameters"`
}

// ScanResult represents the complete scan results
type ScanResult struct {
	Endpoints []EndpointInfo `json:"endpoints"`
	Summary   ScanSummary    `json:"summary"`
	Timestamp string         `json:"timestamp"`
}

// ScanSummary provides statistics about the scan
type ScanSummary struct {
	TotalEndpoints    int               `json:"total_endpoints"`
	EndpointsByModule map[string]int    `json:"endpoints_by_module"`
	EndpointsByMethod map[string]int    `json:"endpoints_by_method"`
	ProtectedCount    int               `json:"protected_count"`
	FilesScanned      int               `json:"files_scanned"`
	ScanTimeMs        int64             `json:"scan_time_ms"`
}

// EndpointScanner scans Go files for API endpoints
type EndpointScanner struct {
	serverDir string
	endpoints []EndpointInfo
	fileSet   *token.FileSet
}

// NewEndpointScanner creates a new endpoint scanner
func NewEndpointScanner(serverDir string) *EndpointScanner {
	return &EndpointScanner{
		serverDir: serverDir,
		endpoints: make([]EndpointInfo, 0),
		fileSet:   token.NewFileSet(),
	}
}

// ScanEndpoints scans all handler files for API endpoints
func (s *EndpointScanner) ScanEndpoints() (*ScanResult, error) {
	startTime := time.Now()
	s.endpoints = make([]EndpointInfo, 0)
	filesScanned := 0

	err := filepath.WalkDir(s.serverDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip non-Go files and test files
		if !strings.HasSuffix(path, ".go") || strings.Contains(path, "_test.go") {
			return nil
		}

		// Focus on handler files and main.go
		if strings.Contains(path, "handler") || strings.Contains(path, "main.go") || 
		   strings.Contains(path, "routes") || strings.Contains(path, "router") {
			
			fmt.Printf("Scanning: %s\n", path)
			if err := s.scanFile(path); err != nil {
				fmt.Printf("Error scanning %s: %v\n", path, err)
			}
			filesScanned++
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	scanTime := time.Since(startTime).Milliseconds()

	result := &ScanResult{
		Endpoints: s.endpoints,
		Summary:   s.generateSummary(filesScanned, scanTime),
		Timestamp: time.Now().Format(time.RFC3339),
	}

	return result, nil
}

// scanFile scans a single Go file for endpoints
func (s *EndpointScanner) scanFile(filePath string) error {
	// Parse the Go file
	src, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	node, err := parser.ParseFile(s.fileSet, filePath, src, parser.ParseComments)
	if err != nil {
		return err
	}

	// Extract module name from file path
	module := s.extractModule(filePath)

	// Convert source to string for pattern matching
	content := string(src)

	// Look for route registration patterns
	s.findRouteRegistrations(content, filePath, module)

	// Look for handler functions
	s.findHandlerFunctions(node, content, filePath, module)

	return nil
}

// findRouteRegistrations looks for Echo route registrations
func (s *EndpointScanner) findRouteRegistrations(content, filePath, module string) {
	// Patterns for Echo route registrations
	patterns := []struct {
		regex   *regexp.Regexp
		methods []string
	}{
		{regexp.MustCompile(`\.GET\s*\(\s*"([^"]+)"`), []string{"GET"}},
		{regexp.MustCompile(`\.POST\s*\(\s*"([^"]+)"`), []string{"POST"}},
		{regexp.MustCompile(`\.PUT\s*\(\s*"([^"]+)"`), []string{"PUT"}},
		{regexp.MustCompile(`\.PATCH\s*\(\s*"([^"]+)"`), []string{"PATCH"}},
		{regexp.MustCompile(`\.DELETE\s*\(\s*"([^"]+)"`), []string{"DELETE"}},
		{regexp.MustCompile(`\.OPTIONS\s*\(\s*"([^"]+)"`), []string{"OPTIONS"}},
		{regexp.MustCompile(`\.Any\s*\(\s*"([^"]+)"`), []string{"ANY"}},
		{regexp.MustCompile(`\.Group\s*\(\s*"([^"]+)"`), []string{}}, // Route groups
	}

	lines := strings.Split(content, "\n")
	
	for lineNum, line := range lines {
		for _, pattern := range patterns {
			matches := pattern.regex.FindStringSubmatch(line)
			if len(matches) >= 2 {
				path := matches[1]
				methods := pattern.methods
				
				// For generic Handle, try to extract method from second capture group
				if len(matches) >= 3 && len(methods) == 0 {
					methods = []string{strings.ToUpper(matches[2])}
				}

				// Extract handler function name from the line
				handlerName := s.extractHandlerFromLine(line)
				
				endpoint := EndpointInfo{
					Path:         path,
					Methods:      methods,
					Handler:      handlerName,
					Module:       module,
					Protected:    s.isProtectedEndpoint(content, path),
					File:         filePath,
					LineNumber:   lineNum + 1,
					Description:  s.extractDescriptionFromComments(lines, lineNum),
					Parameters:   s.extractParameters(path),
				}
				
				s.endpoints = append(s.endpoints, endpoint)
			}
		}
	}
}

// findHandlerFunctions looks for HTTP handler functions
func (s *EndpointScanner) findHandlerFunctions(node *ast.File, content, filePath, module string) {
	ast.Inspect(node, func(n ast.Node) bool {
		switch fn := n.(type) {
		case *ast.FuncDecl:
			if fn.Name != nil && s.isHandlerFunction(fn) {
				// Try to determine the endpoint path from function name or comments
				funcName := fn.Name.Name
				
				// Look for route paths in comments
				if fn.Doc != nil {
					for _, comment := range fn.Doc.List {
						if path := s.extractPathFromComment(comment.Text); path != "" {
							endpoint := EndpointInfo{
								Path:         path,
								Methods:      s.extractMethodsFromFunction(fn, content),
								Handler:      funcName,
								Module:       module,
								Protected:    s.isProtectedFunction(fn, content),
								File:         filePath,
								FunctionName: funcName,
								LineNumber:   s.fileSet.Position(fn.Pos()).Line,
								Description:  s.extractFunctionDescription(fn),
								Parameters:   s.extractParameters(path),
							}
							s.endpoints = append(s.endpoints, endpoint)
							break
						}
					}
				}
			}
		}
		return true
	})
}

// isHandlerFunction checks if a function is likely an HTTP handler
func (s *EndpointScanner) isHandlerFunction(fn *ast.FuncDecl) bool {
	if fn.Type.Params == nil || len(fn.Type.Params.List) == 0 {
		return false
	}

	// Check for echo.Context parameter
	for _, param := range fn.Type.Params.List {
		if star, ok := param.Type.(*ast.StarExpr); ok {
			if sel, ok := star.X.(*ast.SelectorExpr); ok {
				if ident, ok := sel.X.(*ast.Ident); ok {
					if ident.Name == "echo" && sel.Sel.Name == "Context" {
						return true
					}
				}
			}
		}
		// Also check for non-pointer echo.Context
		if sel, ok := param.Type.(*ast.SelectorExpr); ok {
			if ident, ok := sel.X.(*ast.Ident); ok {
				if ident.Name == "echo" && sel.Sel.Name == "Context" {
					return true
				}
			}
		}
	}

	return false
}

// extractModule extracts module name from file path
func (s *EndpointScanner) extractModule(filePath string) string {
	parts := strings.Split(filePath, "/")
	for i, part := range parts {
		if part == "apps" && i+2 < len(parts) && parts[i+1] == "server" {
			if i+3 < len(parts) {
				return parts[i+2] // Return the module name after server/
			}
		}
	}
	
	// Fallback: use the directory name
	dir := filepath.Dir(filePath)
	return filepath.Base(dir)
}

// extractHandlerFromLine extracts handler function name from route registration line
func (s *EndpointScanner) extractHandlerFromLine(line string) string {
	// Look for function calls like handlers.SomeHandler
	handlerRegex := regexp.MustCompile(`([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*)\s*\)`)
	matches := handlerRegex.FindStringSubmatch(line)
	if len(matches) >= 2 {
		return matches[1]
	}
	return "unknown"
}

// isProtectedEndpoint checks if an endpoint requires authentication
func (s *EndpointScanner) isProtectedEndpoint(content, path string) bool {
	authKeywords := []string{
		"auth.Required",
		"RequireAuth",
		"AuthMiddleware",
		"JWTMiddleware",
		"middleware.Auth",
		"Protected",
	}

	// Look for authentication middleware in the context of this path
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		if strings.Contains(line, path) {
			// Check surrounding lines for auth middleware
			for _, keyword := range authKeywords {
				if strings.Contains(line, keyword) {
					return true
				}
			}
		}
	}

	return false
}

// extractDescriptionFromComments extracts description from comments above the line
func (s *EndpointScanner) extractDescriptionFromComments(lines []string, lineNum int) string {
	if lineNum > 0 && lineNum-1 < len(lines) {
		prevLine := strings.TrimSpace(lines[lineNum-1])
		if strings.HasPrefix(prevLine, "//") {
			return strings.TrimSpace(strings.TrimPrefix(prevLine, "//"))
		}
	}
	return ""
}

// extractParameters extracts path parameters from route path
func (s *EndpointScanner) extractParameters(path string) []string {
	var params []string
	
	// Echo-style parameters (:param)
	echoParams := regexp.MustCompile(`:(\w+)`).FindAllStringSubmatch(path, -1)
	for _, match := range echoParams {
		if len(match) >= 2 {
			params = append(params, match[1])
		}
	}
	
	// Wildcard parameters (*param)
	wildcardParams := regexp.MustCompile(`\*(\w+)`).FindAllStringSubmatch(path, -1)
	for _, match := range wildcardParams {
		if len(match) >= 2 {
			params = append(params, "..."+match[1])
		}
	}
	
	return params
}

// extractPathFromComment tries to extract API path from comment
func (s *EndpointScanner) extractPathFromComment(comment string) string {
	// Look for @route or @path annotations
	patterns := []string{
		`@route\s+([^\s]+)`,
		`@path\s+([^\s]+)`,
		`Route:\s*([^\s]+)`,
		`Path:\s*([^\s]+)`,
		`/api/[^\s]*`,
	}
	
	for _, pattern := range patterns {
		regex := regexp.MustCompile(pattern)
		matches := regex.FindStringSubmatch(comment)
		if len(matches) >= 2 {
			return matches[1]
		}
	}
	
	return ""
}

// extractMethodsFromFunction tries to extract HTTP methods from function content
func (s *EndpointScanner) extractMethodsFromFunction(fn *ast.FuncDecl, content string) []string {
	funcName := fn.Name.Name
	
	// Common patterns in function names
	methodPrefixes := map[string][]string{
		"Get":    {"GET"},
		"Post":   {"POST"},
		"Put":    {"PUT"},
		"Patch":  {"PATCH"},
		"Delete": {"DELETE"},
		"Create": {"POST"},
		"Update": {"PUT", "PATCH"},
		"List":   {"GET"},
		"Show":   {"GET"},
	}
	
	for prefix, methods := range methodPrefixes {
		if strings.HasPrefix(funcName, prefix) {
			return methods
		}
	}
	
	return []string{"UNKNOWN"}
}

// isProtectedFunction checks if a function has authentication requirements
func (s *EndpointScanner) isProtectedFunction(fn *ast.FuncDecl, content string) bool {
	// Look for auth-related code in function
	authPatterns := []string{
		"c.Get(\"user\")",
		"c.Get(\"userID\")",
		"GetUserFromContext",
		"RequireAuth",
		"CheckAuth",
	}
	
	// Get function content
	if fn.Body != nil {
		for _, pattern := range authPatterns {
			if strings.Contains(content, pattern) {
				return true
			}
		}
	}
	
	return false
}

// extractFunctionDescription extracts description from function doc comments
func (s *EndpointScanner) extractFunctionDescription(fn *ast.FuncDecl) string {
	if fn.Doc != nil {
		var description strings.Builder
		for _, comment := range fn.Doc.List {
			line := strings.TrimSpace(strings.TrimPrefix(comment.Text, "//"))
			if line != "" {
				if description.Len() > 0 {
					description.WriteString(" ")
				}
				description.WriteString(line)
			}
		}
		return description.String()
	}
	return ""
}

// generateSummary creates a summary of the scan results
func (s *EndpointScanner) generateSummary(filesScanned int, scanTimeMs int64) ScanSummary {
	summary := ScanSummary{
		TotalEndpoints:    len(s.endpoints),
		EndpointsByModule: make(map[string]int),
		EndpointsByMethod: make(map[string]int),
		ProtectedCount:    0,
		FilesScanned:      filesScanned,
		ScanTimeMs:        scanTimeMs,
	}

	for _, endpoint := range s.endpoints {
		// Count by module
		summary.EndpointsByModule[endpoint.Module]++
		
		// Count by method
		for _, method := range endpoint.Methods {
			summary.EndpointsByMethod[method]++
		}
		
		// Count protected endpoints
		if endpoint.Protected {
			summary.ProtectedCount++
		}
	}

	return summary
}

// ExportToJSON exports the scan results to a JSON file
func (s *EndpointScanner) ExportToJSON(result *ScanResult, filePath string) error {
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return err
	}
	
	return os.WriteFile(filePath, data, 0644)
}

// GenerateMarkdownReport generates a markdown report
func (s *EndpointScanner) GenerateMarkdownReport(result *ScanResult) string {
	var report strings.Builder
	
	report.WriteString("# Backend API Endpoints Analysis\n\n")
	report.WriteString(fmt.Sprintf("*Generated on: %s*\n\n", result.Timestamp))
	
	// Summary
	report.WriteString("## Summary\n\n")
	report.WriteString(fmt.Sprintf("- **Total Endpoints**: %d\n", result.Summary.TotalEndpoints))
	report.WriteString(fmt.Sprintf("- **Protected Endpoints**: %d\n", result.Summary.ProtectedCount))
	report.WriteString(fmt.Sprintf("- **Files Scanned**: %d\n", result.Summary.FilesScanned))
	report.WriteString(fmt.Sprintf("- **Scan Time**: %dms\n\n", result.Summary.ScanTimeMs))
	
	// Endpoints by Module
	report.WriteString("## Endpoints by Module\n\n")
	for module, count := range result.Summary.EndpointsByModule {
		report.WriteString(fmt.Sprintf("- **%s**: %d endpoints\n", module, count))
	}
	report.WriteString("\n")
	
	// Endpoints by Method
	report.WriteString("## Endpoints by HTTP Method\n\n")
	for method, count := range result.Summary.EndpointsByMethod {
		report.WriteString(fmt.Sprintf("- **%s**: %d endpoints\n", method, count))
	}
	report.WriteString("\n")
	
	// All Endpoints Table
	report.WriteString("## All Endpoints\n\n")
	report.WriteString("| Path | Methods | Module | Protected | Handler | File |\n")
	report.WriteString("|------|---------|--------|-----------|---------|------|\n")
	
	for _, endpoint := range result.Endpoints {
		methods := strings.Join(endpoint.Methods, ", ")
		protected := "❌"
		if endpoint.Protected {
			protected = "✅"
		}
		
		report.WriteString(fmt.Sprintf("| %s | %s | %s | %s | %s | %s |\n",
			endpoint.Path,
			methods,
			endpoint.Module,
			protected,
			endpoint.Handler,
			filepath.Base(endpoint.File),
		))
	}
	
	return report.String()
}

func main() {
	fmt.Println("🔍 AgroMart Backend Endpoint Scanner")
	fmt.Println("Analyzing Go server handler files...\n")

	scanner := NewEndpointScanner("./apps/server")
	result, err := scanner.ScanEndpoints()
	if err != nil {
		fmt.Printf("❌ Error scanning endpoints: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ Scan completed successfully!\n")
	fmt.Printf("⏱️  Scan time: %dms\n\n", result.Summary.ScanTimeMs)
	
	fmt.Printf("📊 SUMMARY:\n")
	fmt.Printf("├── Total Endpoints: %d\n", result.Summary.TotalEndpoints)
	fmt.Printf("├── Protected Endpoints: %d\n", result.Summary.ProtectedCount)
	fmt.Printf("├── Files Scanned: %d\n", result.Summary.FilesScanned)
	fmt.Printf("└── Modules Found: %d\n\n", len(result.Summary.EndpointsByModule))

	// Show endpoints by module
	fmt.Printf("📦 ENDPOINTS BY MODULE:\n")
	for module, count := range result.Summary.EndpointsByModule {
		fmt.Printf("  └── %s: %d endpoints\n", module, count)
	}

	// Show some example endpoints
	fmt.Printf("\n🔌 SAMPLE ENDPOINTS:\n")
	for i, endpoint := range result.Endpoints {
		if i >= 10 { // Show first 10
			break
		}
		methods := strings.Join(endpoint.Methods, ", ")
		protection := "🔓"
		if endpoint.Protected {
			protection = "🔒"
		}
		fmt.Printf("  %s %s %s (%s)\n", protection, methods, endpoint.Path, endpoint.Module)
	}

	// Export results
	fmt.Printf("\n📤 EXPORTING RESULTS:\n")
	
	// Export JSON
	jsonPath := "./backend-endpoints-scan.json"
	if err := scanner.ExportToJSON(result, jsonPath); err != nil {
		fmt.Printf("❌ Error exporting JSON: %v\n", err)
	} else {
		fmt.Printf("├── JSON export: %s\n", jsonPath)
	}
	
	// Export Markdown
	report := scanner.GenerateMarkdownReport(result)
	reportPath := "./BACKEND_ENDPOINTS_ANALYSIS.md"
	if err := os.WriteFile(reportPath, []byte(report), 0644); err != nil {
		fmt.Printf("❌ Error writing report: %v\n", err)
	} else {
		fmt.Printf("└── Report: %s\n", reportPath)
	}

	fmt.Printf("\n✨ Backend endpoint scanning completed successfully!\n")
}