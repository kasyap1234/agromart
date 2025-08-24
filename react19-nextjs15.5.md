# Next.js 15.5 & React 19 Documentation

This document contains extracted information from Next.js 15.5 and React 19 official documentation.

*Generated on: 2025-08-24 02:42:54*

---

## Next.js Docs

**Source:** https://nextjs.org/docs

Using App Router


Features available in /app


Using Latest Version


### Next.js Docs


Welcome to the Next.js documentation!


#### What is Next.js?


Next.js is a React framework for building full-stack web applications. You use React Components to build user interfaces, and Next.js for additional features and optimizations.


It also automatically configures lower-level tools like bundlers and compilers. You can instead focus on building your product and shipping quickly.


Whether you're an individual developer or part of a larger team, Next.js can help you build interactive, dynamic, and fast React applications.


#### How to use the docs


The docs are organized into 3 sections:


Getting Started: Step-by-step tutorials to help you create a new application and learn the core Next.js features.
Guides: Tutorials on specific use cases, choose what's relevant to you.
API Reference: Detailed technical reference for every feature.

Use the sidebar to navigate through the sections, or search (Ctrl+K or Cmd+K) to quickly find a page.


#### App Router and Pages Router


Next.js has two different routers:


App Router: The newer router that supports new React features like Server Components.
Pages Router: The original router, still supported and being improved.

At the top of the sidebar, you'll notice a dropdown menu that allows you to switch between the App Router and the Pages Router docs.


##### React version handling


The App Router and Pages Router handle React versions differently:


App Router: Uses React canary releases built-in, which include all the stable React 19 changes, as well as newer features being validated in frameworks, prior to a new React release.


Pages Router: Uses the React version installed in your project's package.json.

App Router: Uses React canary releases built-in, which include all the stable React 19 changes, as well as newer features being validated in frameworks, prior to a new React release.


Pages Router: Uses the React version installed in your project's package.json.


`package.json`
This approach ensures new React features work reliably in the App Router while maintaining backwards compatibility for existing Pages Router applications.


#### Pre-requisite knowledge


Our documentation assumes some familiarity with web development. Before getting started, it'll help if you're comfortable with:


HTML
CSS
JavaScript
React

If you're new to React or need a refresher, we recommend starting with our React Foundations course, and the Next.js Foundations course that has you building an application as you learn.


#### Accessibility


For the best experience when using a screen reader, we recommend using Firefox and NVDA, or Safari and VoiceOver.


#### Join our Community


If you have questions about anything related to Next.js, you're always welcome to ask our community on GitHub Discussions, Discord, X (Twitter), and Reddit.


##### Getting Started


Was this helpful?



---

## Installation

**Source:** https://nextjs.org/docs/getting-started/installation

Using App Router


Features available in /app


Using Latest Version


### Installation


#### System requirements


Before you begin, make sure your system meets the following requirements:


Node.js 18.18 or later.
macOS, Windows (including WSL), or Linux.

#### Automatic installation


The quickest way to create a new Next.js app is using create-next-app, which sets up everything automatically for you. To create a project, run:


`create-next-app`
```
npx create-next-app@latest
```


`npx create-next-app@latest`
On installation, you'll see the following prompts:


```
What is your project named? my-app
Would you like to use TypeScript? No / Yes
Would you like to use ESLint? No / Yes
Would you like to use Tailwind CSS? No / Yes
Would you like your code inside a `src/` directory? No / Yes
Would you like to use App Router? (recommended) No / Yes
Would you like to use Turbopack? (recommended) No / Yes
Would you like to customize the import alias (`@/*` by default)? No / Yes
What import alias would you like configured? @/*
```


`What is your project named? my-app
Would you like to use TypeScript? No / Yes
Would you like to use ESLint? No / Yes
Would you like to use Tailwind CSS? No / Yes
Would you like your code inside a `src/` directory? No / Yes
Would you like to use App Router? (recommended) No / Yes
Would you like to use Turbopack? (recommended) No / Yes
Would you like to customize the import alias (`@/*` by default)? No / Yes
What import alias would you like configured? @/*`
After the prompts, create-next-app will create a folder with your project name and install the required dependencies.


`create-next-app`
#### Manual installation


To manually create a new Next.js app, install the required packages:


```
pnpm i next@latest react@latest react-dom@latest
```


`pnpm i next@latest react@latest react-dom@latest`
Good to know: The App Router uses React canary releases built-in, which include all the stable React 19 changes, as well as newer features being validated in frameworks. The Pages Router uses the React version you install in package.json.


`package.json`
Then, add the following scripts to your package.json file:


`package.json`
```
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```


`{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}`
These scripts refer to the different stages of developing an application:


next dev: Starts the development server.
next build: Builds the application for production.
next start: Starts the production server.
eslint: Runs ESLint.

##### Create the app directory


Next.js uses file-system routing, which means the routes in your application are determined by how you structure your files.


Create an app folder. Then, inside app, create a layout.tsx file. This file is the root layout. It's required and must contain the  and  tags.


```
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      {children}
    
  )
}
```


`export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      {children}
    
  )
}`
Create a home page app/page.tsx with some initial content:


`app/page.tsx`
```
export default function Page() {
  return ### Hello, Next.js!


}
```


`export default function Page() {
  return ### Hello, Next.js!


}`
Both layout.tsx and page.tsx will be rendered when the user visits the root of your application (/).


Good to know:


If you forget to create the root layout, Next.js will automatically create this file when running the development server with next dev.
You can optionally use a src folder in the root of your project to separate your application's code from configuration files.

##### Create the public folder (optional)


Create a public folder at the root of your project to store static assets such as images, fonts, etc. Files inside public can then be referenced by your code starting from the base URL (/).


You can then reference these assets using the root path (/). For example, public/profile.png can be referenced as /profile.png:


`public/profile.png`
`/profile.png`
```
import Image from 'next/image'
 
export default function Page() {
  return 
}
```


`import Image from 'next/image'
 
export default function Page() {
  return 
}`
#### Run the development server


Run npm run dev to start the development server.
Visit http://localhost:3000 to view your application.
Edit the app/page.tsx file and save it to see the updated result in your browser.


---

## Project structure and organization

**Source:** https://nextjs.org/docs/getting-started/project-structure

Using App Router


Features available in /app


Using Latest Version


### Project structure and organization


This page provides an overview of all the folder and file conventions in Next.js, and recommendations for organizing your project.


#### Folder and file conventions


##### Top-level folders


Top-level folders are used to organize your application's code and static assets.


##### Top-level files


Top-level files are used to configure your application, manage dependencies, run middleware, integrate monitoring tools, and define environment variables.


`next.config.js`
`package.json`
`instrumentation.ts`
`middleware.ts`
`.env.production`
`.env.development`
`.eslintrc.json`
`next-env.d.ts`
`tsconfig.json`
`jsconfig.json`
##### Routing Files


`global-error`
##### Nested routes


`folder/folder`
##### Dynamic routes


`[...folder]`
`[[...folder]]`
##### Route Groups and private folders


##### Parallel and Intercepted Routes


`(..)(..)folder`
`(...)folder`
##### Metadata file conventions


###### Open Graph and Twitter images


`opengraph-image`
`opengraph-image`
`twitter-image`
`twitter-image`
#### Organizing your project


Next.js is unopinionated about how you organize and colocate your project files. But it does provide several features to help you organize your project.


##### Component hierarchy


The components defined in special files are rendered in a specific hierarchy:


layout.js
template.js
error.js (React error boundary)
loading.js (React suspense boundary)
not-found.js (React error boundary)
page.js or nested layout.js

`template.js`
`not-found.js`
The components are rendered recursively in nested routes, meaning the components of a route segment will be nested inside the components of its parent segment.


In the app directory, nested folders define route structure. Each folder represents a route segment that is mapped to a corresponding segment in a URL path.


However, even though route structure is defined through folders, a route is not publicly accessible until a page.js or route.js file is added to a route segment.


And, even when a route is made publicly accessible, only the content returned by page.js or route.js is sent to the client.


This means that project files can be safely colocated inside route segments in the app directory without accidentally being routable.


Good to know: While you can colocate your project files in app you don't have to. If you prefer, you can keep them outside the app directory.



---

## Layouts and Pages

**Source:** https://nextjs.org/docs/app/building-your-application/routing

Using App Router


Features available in /app


Using Latest Version


### Layouts and Pages


Next.js uses file-system based routing, meaning you can use folders and files to define routes. This page will guide you through how to create layouts and pages, and link between them.


#### Creating a page


A page is UI that is rendered on a specific route. To create a page, add a page file inside the app directory and default export a React component. For example, to create an index page (/):


```
export default function Page() {
  return ### Hello Next.js!


}
```


`export default function Page() {
  return ### Hello Next.js!


}`
#### Creating a layout


A layout is UI that is shared between multiple pages. On navigation, layouts preserve state, remain interactive, and do not rerender.


You can define a layout by default exporting a React component from a layout file. The component should accept a children prop which can be a page or another layout.


For example, to create a layout that accepts your index page as child, add a layout file inside the app directory:


```
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      
        {/* Layout UI */}
        {/* Place children where you want to render a page or nested layout */}
        {children}
      
    
  )
}
```


`export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      
        {/* Layout UI */}
        {/* Place children where you want to render a page or nested layout */}
        {children}
      
    
  )
}`
The layout above is called a root layout because it's defined at the root of the app directory. The root layout is required and must contain html and body tags.


#### Creating a nested route


A nested route is a route composed of multiple URL segments. For example, the /blog/[slug] route is composed of three segments:


`/blog/[slug]`
/ (Root Segment)
blog (Segment)
[slug] (Leaf Segment)

In Next.js:


Folders are used to define the route segments that map to URL segments.
Files (like page and layout) are used to create UI that is shown for a segment.

To create nested routes, you can nest folders inside each other. For example, to add a route for /blog, create a folder called blog in the app directory. Then, to make /blog publicly accessible, add a page.tsx file:


```
// Dummy imports
import { getPosts } from '@/lib/posts'
import { Post } from '@/ui/post'
 
export default async function Page() {
  const posts = await getPosts()
 
  return (
    
      {posts.map((post) => (
        
      ))}
    

  )
}
```


`// Dummy imports
import { getPosts } from '@/lib/posts'
import { Post } from '@/ui/post'
 
export default async function Page() {
  const posts = await getPosts()
 
  return (
    
      {posts.map((post) => (
        
      ))}
    

  )
}`
You can continue nesting folders to create nested routes. For example, to create a route for a specific blog post, create a new [slug] folder inside blog and add a page file:


```
function generateStaticParams() {}
 
export default function Page() {
  return ### Hello, Blog Post Page!


}
```


`function generateStaticParams() {}
 
export default function Page() {
  return ### Hello, Blog Post Page!


}`
Wrapping a folder name in square brackets (e.g. [slug]) creates a dynamic route segment which is used to generate multiple pages from data. e.g. blog posts, product pages, etc.


#### Nesting layouts


By default, layouts in the folder hierarchy are also nested, which means they wrap child layouts via their children prop. You can nest layouts by adding layout inside specific route segments (folders).


For example, to create a layout for the /blog route, add a new layout file inside the blog folder.


```
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return {children}
}
```


`export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return {children}
}`
If you were to combine the two layouts above, the root layout (app/layout.js) would wrap the blog layout (app/blog/layout.js), which would wrap the blog (app/blog/page.js) and blog post page (app/blog/[slug]/page.js).


`app/layout.js`
`app/blog/layout.js`
`app/blog/page.js`
`app/blog/[slug]/page.js`
#### Creating a dynamic segment


Dynamic segments allow you to create routes that are generated from data. For example, instead of manually creating a route for each individual blog post, you can create a dynamic segment to generate the routes based on blog post data.


To create a dynamic segment, wrap the segment (folder) name in square brackets: [segmentName]. For example, in the app/blog/[slug]/page.tsx route, the [slug] is the dynamic segment.


`[segmentName]`
`app/blog/[slug]/page.tsx`
```
export default async function BlogPostPage({
  params,
}: {
  params: Promise
}) {
  const { slug } = await params
  const post = await getPost(slug)
 
  return (
    
      ### {post.title}


      {post.content}


    
  )
}
```


`export default async function BlogPostPage({
  params,
}: {
  params: Promise
}) {
  const { slug } = await params
  const post = await getPost(slug)
 
  return (
    
      ### {post.title}


      {post.content}


    
  )
}`
Learn more about Dynamic Segments and the params props.


Nested layouts within Dynamic Segments, can also access the params props.


#### Rendering with search params


In a Server Component page, you can access search parameters using the searchParams prop:



---

## Partial Prerendering

**Source:** https://nextjs.org/docs/app/building-your-application/rendering

Using App Router


Features available in /app


Using Latest Version


### Partial Prerendering


Partial Prerendering (PPR) is a rendering strategy that allows you to combine static and dynamic content in the same route. This improves the initial page performance while still supporting personalized, dynamic data.


When a user visits a route:


The server sends a shell containing the static content, ensuring a fast initial load.
The shell leaves holes for the dynamic content that will load in asynchronously.
The dynamic holes are streamed in parallel, reducing the overall load time of the page.

🎥 Watch: Why PPR and how it works → YouTube (10 minutes).


#### How does Partial Prerendering work?


To understand Partial Prerendering, it helps to be familiar with the rendering strategies available in Next.js.


##### Static Rendering


With Static Rendering, HTML is generated ahead of time—either at build time or through revalidation. The result is cached and shared across users and requests.


In Partial Prerendering, Next.js prerenders a static shell for a route. This can include the layout and any other components that don't depend on request-time data.


##### Dynamic Rendering


With Dynamic Rendering, HTML is generated at request time. This allows you to serve personalized content based on request-time data.


A component becomes dynamic if it uses the following APIs:


cookies
headers
connection
draftMode
searchParams prop
unstable_noStore
fetch with { cache: 'no-store' }

`searchParams`
`unstable_noStore`
`{ cache: 'no-store' }`
In Partial Prerendering, using these APIs throws a special React error that informs Next.js the component cannot be statically rendered, causing a build error. You can use a Suspense boundary to wrap your component to defer rendering until runtime.


React Suspense is used to defer rendering parts of your application until some condition is met.


In Partial Prerendering, Suspense is used to mark dynamic boundaries in your component tree.


At build time, Next.js prerenders the static content and the fallback UI. The dynamic content is postponed until the user requests the route.


Wrapping a component in Suspense doesn't make the component itself dynamic (your API usage does), but rather Suspense is used as a boundary that encapsulates dynamic content and enable streaming


```
import { Suspense } from 'react'
import StaticComponent from './StaticComponent'
import DynamicComponent from './DynamicComponent'
import Fallback from './Fallback'
 
export const experimental_ppr = true
 
export default function Page() {
  return (
    <>
      
      }>
        
      
    
  )
}
```


`import { Suspense } from 'react'
import StaticComponent from './StaticComponent'
import DynamicComponent from './DynamicComponent'
import Fallback from './Fallback'
 
export const experimental_ppr = true
 
export default function Page() {
  return (
    <>
      
      }>
        
      
    
  )
}`
Streaming splits the route into chunks and progressively streams them to the client as they become ready. This allows the user to see parts of the page immediately, before the entire content has finished rendering.


In Partial Prerendering, dynamic components wrapped in Suspense start streaming from the server in parallel.


To reduce network overhead, the full response—including static HTML and streamed dynamic parts—is sent in a single HTTP request. This avoids extra roundtrips and improves both initial load and overall performance.


#### Enabling Partial Prerendering


You can enable PPR by adding the ppr option to your next.config.ts file:


`next.config.ts`
```
import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  experimental: {
    ppr: 'incremental',
  },
}
 
export default nextConfig
```


`import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  experimental: {
    ppr: 'incremental',
  },
}
 
export default nextConfig`
The 'incremental' value allows you to adopt PPR for specific routes:


`'incremental'`
```
export const experimental_ppr = true
 
export default function Layout({ children }: { children: React.ReactNode }) {
  // ...
}
```


`export const experimental_ppr = true
 
export default function Layout({ children }: { children: React.ReactNode }) {
  // ...
}`
Routes that don't have experimental_ppr will default to false and will not be prerendered using PPR. You need to explicitly opt-in to PPR for each route.


`experimental_ppr`
Good to know:


experimental_ppr will apply to all children of the route segment, including nested layouts and pages. You don't have to add it to every file, only the top segment of a route.
To disable PPR for children segments, you can set experimental_ppr to false in the child segment.

`experimental_ppr`
`experimental_ppr`
##### Dynamic APIs


When using Dynamic APIs that require looking at the incoming request, Next.js will opt into dynamic rendering for the route. To continue using PPR, wrap the component with Suspense. For example, the  component is dynamic because it uses the cookies API:


```
import { cookies } from 'next/headers'
 
export async function User() {
  const session = (await cookies()).get('session')?.value
  return '...'
}
```


`import { cookies } from 'next/headers'
 
export async function User() {
  const session = (await cookies()).get('session')?.value
  return '...'
}`
The  component will be streamed while any other content inside  will be prerendered and become part of the static shell.



---

## Fetching Data

**Source:** https://nextjs.org/docs/app/building-your-application/data-fetching

Using App Router


Features available in /app


Using Latest Version


### Fetching Data


This page will walk you through how you can fetch data in Server and Client Components, and how to stream components that depend on data.


#### Fetching data


##### Server Components


You can fetch data in Server Components using:


The fetch API
An ORM or database

###### With the fetch API


To fetch data with the fetch API, turn your component into an asynchronous function, and await the fetch call. For example:


```
export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog')
  const posts = await data.json()
  return (
    
      {posts.map((post) => (
        {post.title}
      ))}
    

  )
}
```


`export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog')
  const posts = await data.json()
  return (
    
      {posts.map((post) => (
        {post.title}
      ))}
    

  )
}`
Good to know:


fetch responses are not cached by default. However, Next.js will prerender the route and the output will be cached for improved performance. If you'd like to opt into dynamic rendering, use the { cache: 'no-store' } option. See the fetch API Reference.
During development, you can log fetch calls for better visibility and debugging. See the logging API reference.

`{ cache: 'no-store' }`
###### With an ORM or database


Since Server Components are rendered on the server, you can safely make database queries using an ORM or database client. Turn your component into an asynchronous function, and await the call:


```
import { db, posts } from '@/lib/db'
 
export default async function Page() {
  const allPosts = await db.select().from(posts)
  return (
    
      {allPosts.map((post) => (
        {post.title}
      ))}
    

  )
}
```


`import { db, posts } from '@/lib/db'
 
export default async function Page() {
  const allPosts = await db.select().from(posts)
  return (
    
      {allPosts.map((post) => (
        {post.title}
      ))}
    

  )
}`
##### Client Components


There are two ways to fetch data in Client Components, using:


React's use hook
A community library like SWR or React Query

###### Streaming data with the use hook


You can use React's use hook to stream data from the server to client. Start by fetching data in your Server component, and pass the promise to your Client Component as prop:


```
import Posts from '@/app/ui/posts'
import { Suspense } from 'react'
 
export default function Page() {
  // Don't await the data fetching function
  const posts = getPosts()
 
  return (
    Loading...}>
      
    
  )
}
```


`import Posts from '@/app/ui/posts'
import { Suspense } from 'react'
 
export default function Page() {
  // Don't await the data fetching function
  const posts = getPosts()
 
  return (
    Loading...}>
      
    
  )
}`
Then, in your Client Component, use the use hook to read the promise:


```
'use client'
import { use } from 'react'
 
export default function Posts({
  posts,
}: {
  posts: Promise
}) {
  const allPosts = use(posts)
 
  return (
    
      {allPosts.map((post) => (
        {post.title}
      ))}
    

  )
}
```


`'use client'
import { use } from 'react'
 
export default function Posts({
  posts,
}: {
  posts: Promise
}) {
  const allPosts = use(posts)
 
  return (
    
      {allPosts.map((post) => (
        {post.title}
      ))}
    

  )
}`
In the example above, the  component is wrapped in a  boundary. This means the fallback will be shown while the promise is being resolved. Learn more about streaming.


###### Community libraries


You can use a community library like SWR or React Query to fetch data in Client Components. These libraries have their own semantics for caching, streaming, and other features. For example, with SWR:


```
'use client'
import useSWR from 'swr'
 
const fetcher = (url) => fetch(url).then((r) => r.json())
 
export default function BlogPage() {
  const { data, error, isLoading } = useSWR(
    'https://api.vercel.app/blog',
    fetcher
  )
 
  if (isLoading) return Loading...
  if (error) return Error: {error.message}
 
  return (
    
      {data.map((post: { id: string; title: string }) => (
        {post.title}
      ))}
    

  )
}
```


`'use client'
import useSWR from 'swr'
 
const fetcher = (url) => fetch(url).then((r) => r.json())
 
export default function BlogPage() {
  const { data, error, isLoading } = useSWR(
    'https://api.vercel.app/blog',
    fetcher
  )
 
  if (isLoading) return Loading...
  if (error) return Error: {error.message}
 
  return (
    
      {data.map((post: { id: string; title: string }) => (
        {post.title}
      ))}
    

  )
}`
#### Deduplicate requests and cache data


One way to deduplicate fetch requests is with request memoization. With this mechanism, fetch calls using GET or HEAD with the same URL and options in a single render pass are combined into one request. This happens automatically, and you can opt out by passing an Abort signal to fetch.


Request memoization is scoped to the lifetime of a request.


You can also deduplicate fetch requests by using Next.js’ Data Cache, for example by setting cache: 'force-cache' in your fetch options.


`cache: 'force-cache'`
Data Cache allows sharing data across the current render pass and incoming requests.


If you are not using fetch, and instead using an ORM or database directly, you can wrap your data access with the React cache function.


```
import { cache } from 'react'
import { db, posts, eq } from '@/lib/db'
 
export const getPost = cache(async (id: string) => {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, parseInt(id)),
  })
})
```


`import { cache } from 'react'
import { db, posts, eq } from '@/lib/db'
 
export const getPost = cache(async (id: string) => {
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, parseInt(id)),
  })
})`
Warning: The content below assumes the cacheComponents config option is enabled in your application. The flag was introduced in Next.js 15 canary.


`cacheComponents`
When using async/await in Server Components, Next.js will opt into dynamic rendering. This means the data will be fetched and rendered on the server for every user request. If there are any slow data requests, the whole route will be blocked from rendering.


`async/await`
To improve the initial load time and user experience, you can use streaming to break up the page's HTML into smaller chunks and progressively send those chunks from the server to the client.


There are two ways you can implement streaming in your application:



---

## CSS

**Source:** https://nextjs.org/docs/app/building-your-application/styling

Using App Router


Features available in /app


Using Latest Version


Next.js provides several ways to style your application using CSS, including:


Tailwind CSS
CSS Modules
Global CSS
External Stylesheets
Sass
CSS-in-JS

#### Tailwind CSS


Tailwind CSS is a utility-first CSS framework that provides low-level utility classes to build custom designs.


Install Tailwind CSS:


```
pnpm add -D tailwindcss @tailwindcss/postcss
```


`pnpm add -D tailwindcss @tailwindcss/postcss`
Add the PostCSS plugin to your postcss.config.mjs file:


`postcss.config.mjs`
```
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```


`export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}`
Import Tailwind in your global CSS file:


```
@import 'tailwindcss';
```


`@import 'tailwindcss';`
Import the CSS file in your root layout:


```
import './globals.css'
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      {children}
    
  )
}
```


`import './globals.css'
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      {children}
    
  )
}`
Now you can start using Tailwind's utility classes in your application:


```
export default function Page() {
  return (
    
      Welcome to Next.js!


    
  )
}
```


`export default function Page() {
  return (
    
      Welcome to Next.js!


    
  )
}`
Good to know: If you need broader browser support for very old browsers, see the Tailwind CSS v3 setup instructions.


#### CSS Modules


CSS Modules locally scope CSS by generating unique class names. This allows you to use the same class in different files without worrying about naming collisions.


To start using CSS Modules, create a new file with the extension .module.css and import it into any component inside the app directory:


`.module.css`
```
.blog {
  padding: 24px;
}
```


`.blog {
  padding: 24px;
}`
```
import styles from './blog.module.css'
 
export default function Page() {
  return 
}
```


`import styles from './blog.module.css'
 
export default function Page() {
  return 
}`
You can use global CSS to apply styles across your application.


Create a app/global.css file and import it in the root layout to apply the styles to every route in your application:


`app/global.css`
```
body {
  padding: 20px 20px 60px;
  max-width: 680px;
  margin: 0 auto;
}
```


`body {
  padding: 20px 20px 60px;
  max-width: 680px;
  margin: 0 auto;
}`
```
// These styles apply to every route in the application
import './global.css'
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      {children}
    
  )
}
```


`// These styles apply to every route in the application
import './global.css'
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      {children}
    
  )
}`
Good to know: Global styles can be imported into any layout, page, or component inside the app directory. However, since Next.js uses React's built-in support for stylesheets to integrate with Suspense, this currently does not remove stylesheets as you navigate between routes which can lead to conflicts. We recommend using global styles for truly global CSS (like Tailwind's base styles), Tailwind CSS for component styling, and CSS Modules for custom scoped CSS when needed.


#### External stylesheets


Stylesheets published by external packages can be imported anywhere in the app directory, including colocated components:


```
import 'bootstrap/dist/css/bootstrap.css'
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      {children}
    
  )
}
```


`import 'bootstrap/dist/css/bootstrap.css'
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
      {children}
    
  )
}`
Good to know: In React 19,  can also be used. See the React link documentation for more information.


``
#### Ordering and Merging


Next.js optimizes CSS during production builds by automatically chunking (merging) stylesheets. The order of your CSS depends on the order you import styles in your code.


For example, base-button.module.css will be ordered before page.module.css since  is imported before page.module.css:


`base-button.module.css`

---

## Getting Started

**Source:** https://nextjs.org/docs/app/building-your-application/optimizing

Using App Router


Features available in /app


Using Latest Version


### Getting Started


Welcome to the Next.js documentation!


This Getting Started section will help you create your first Next.js app and learn the core features you'll use in every project.


#### Pre-requisite knowledge


Our documentation assumes some familiarity with web development. Before getting started, it'll help if you're comfortable with:


HTML
CSS
JavaScript
React

If you're new to React or need a refresher, we recommend starting with our React Foundations course, and the Next.js Foundations course that has you building an application as you learn.


##### Installation


##### Project Structure


##### Layouts and Pages


##### Linking and Navigating


##### Server and Client Components


##### Partial Prerendering


##### Fetching Data


##### Updating Data


##### Caching and Revalidating


##### Error Handling


##### Image Optimization


##### Font Optimization


##### Metadata and OG images


##### Route Handlers and Middleware


Was this helpful?



---

## Configuration

**Source:** https://nextjs.org/docs/app/building-your-application/configuring

Using App Router


Features available in /app


Using Latest Version


### Configuration


##### next.config.js


Was this helpful?



---

## Deploying

**Source:** https://nextjs.org/docs/app/building-your-application/deploying

Using App Router


Features available in /app


Using Latest Version


Next.js can be deployed as a Node.js server, Docker container, static export, or adapted to run on different platforms.


#### Node.js server


Next.js can be deployed to any provider that supports Node.js. Ensure your package.json has the "build" and "start" scripts:


`package.json`
```
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```


`{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}`
Then, run npm run build to build your application and npm run start to start the Node.js server. This server supports all Next.js features. If needed, you can also eject to a custom server.


`npm run build`
`npm run start`
Node.js deployments support all Next.js features. Learn how to configure them for your infrastructure.


Flightcontrol
Railway
Replit

Next.js can be deployed to any provider that supports Docker containers. This includes container orchestrators like Kubernetes or a cloud provider that runs Docker.


Docker deployments support all Next.js features. Learn how to configure them for your infrastructure.


Note for development: While Docker is excellent for production deployments, consider using local development (npm run dev) instead of Docker during development on Mac and Windows for better performance. Learn more about optimizing local development.


`npm run dev`
Docker
Docker Multi-Environment
DigitalOcean
Fly.io
Google Cloud Run
Render
SST

#### Static export


Next.js enables starting as a static site or Single-Page Application (SPA), then later optionally upgrading to use features that require a server.


Since Next.js supports static exports, it can be deployed and hosted on any web server that can serve HTML/CSS/JS static assets. This includes tools like AWS S3, Nginx, or Apache.


Running as a static export does not support Next.js features that require a server. Learn more.


GitHub Pages

Next.js can be adapted to run on different platforms to support their infrastructure capabilities.


Refer to each provider's documentation for information on supported Next.js features:


AWS Amplify Hosting
Cloudflare
Deno Deploy
Netlify
Vercel

Note: We are working on a Deployment Adapters API for all platforms to adopt. After completion, we will add documentation on how to write your own adapters.


Was this helpful?



---

## API Reference

**Source:** https://nextjs.org/docs/app/api-reference

Using App Router


Features available in /app


Using Latest Version


### API Reference


##### File-system conventions


##### Configuration


##### Edge Runtime


Was this helpful?



---

## Quick Start

**Source:** https://react.dev/learn

### Quick Start


Welcome to the React documentation! This page will give you an introduction to 80% of the React concepts that you will use on a daily basis.


##### You will learn


How to create and nest components
How to add markup and styles
How to display data
How to render conditions and lists
How to respond to events and update the screen
How to share data between components

#### Creating and nesting components


React apps are made out of components. A component is a piece of the UI (user interface) that has its own logic and appearance. A component can be as small as a button, or as large as an entire page.


React components are JavaScript functions that return markup:


```
function MyButton() {  return (    I'm a button  );}
```


`function MyButton() {  return (    I'm a button  );}`
Now that you’ve declared MyButton, you can nest it into another component:


```
export default function MyApp() {  return (          ### Welcome to my app

            );}
```


`export default function MyApp() {  return (          ### Welcome to my app

            );}`
Notice that  starts with a capital letter. That’s how you know it’s a React component. React component names must always start with a capital letter, while HTML tags must be lowercase.


``
Have a look at the result:


```
function MyButton() {
  return (
    
      I'm a button
    
  );
}

export default function MyApp() {
  return (
    
      ### Welcome to my app


      
    
  );
}
```


The export default keywords specify the main component in the file. If you’re not familiar with some piece of JavaScript syntax, MDN and javascript.info have great references.


`export default`
#### Writing markup with JSX


The markup syntax you’ve seen above is called JSX. It is optional, but most React projects use JSX for its convenience. All of the tools we recommend for local development support JSX out of the box.


JSX is stricter than HTML. You have to close tags like . Your component also can’t return multiple JSX tags. You have to wrap them into a shared parent, like a ... or an empty <>... wrapper:


`...`
```
function AboutPage() {  return (    <>      ### About

      Hello there.How do you do?

      );}
```


`function AboutPage() {  return (    <>      ### About

      Hello there.How do you do?

      );}`
If you have a lot of HTML to port to JSX, you can use an online converter.


#### Adding styles


In React, you specify a CSS class with className. It works the same way as the HTML class attribute:


```

```


``
Then you write the CSS rules for it in a separate CSS file:


```
/* In your CSS */.avatar {  border-radius: 50%;}
```


`/* In your CSS */.avatar {  border-radius: 50%;}`
React does not prescribe how you add CSS files. In the simplest case, you’ll add a  tag to your HTML. If you use a build tool or a framework, consult its documentation to learn how to add a CSS file to your project.


#### Displaying data


JSX lets you put markup into JavaScript. Curly braces let you “escape back” into JavaScript so that you can embed some variable from your code and display it to the user. For example, this will display user.name:


```
return (  ###     {user.name}  

);
```


`return (  ###     {user.name}  

);`
You can also “escape into JavaScript” from JSX attributes, but you have to use curly braces instead of quotes. For example, className="avatar" passes the "avatar" string as the CSS class, but src={user.imageUrl} reads the JavaScript user.imageUrl variable value, and then passes that value as the src attribute:


`className="avatar"`
`src={user.imageUrl}`
`user.imageUrl`
```
return (  );
```


`return (  );`
You can put more complex expressions inside the JSX curly braces too, for example, string concatenation:


```
const user = {
  name: 'Hedy Lamarr',
  imageUrl: 'https://i.imgur.com/yXOvdOSs.jpg',
  imageSize: 90,
};

export default function Profile() {
  return (
    <>
      ### {user.name}


      
    
  );
}
```


In the above example, style={{}} is not a special syntax, but a regular {} object inside the style={ } JSX curly braces. You can use the style attribute when your styles depend on JavaScript variables.


#### Conditional rendering


In React, there is no special syntax for writing conditions. Instead, you’ll use the same techniques as you use when writing regular JavaScript code. For example, you can use an if statement to conditionally include JSX:


```
let content;if (isLoggedIn) {  content = ;} else {  content = ;}return (      {content}  );
```


`let content;if (isLoggedIn) {  content = ;} else {  content = ;}return (      {content}  );`

---

## Installation

**Source:** https://react.dev/learn/installation

### Installation


React has been designed from the start for gradual adoption. You can use as little or as much React as you need. Whether you want to get a taste of React, add some interactivity to an HTML page, or start a complex React-powered app, this section will help you get started.


You don’t need to install anything to play with React. Try editing this sandbox!


```
function Greeting({ name }) {
  return ### Hello, {name}

;
}

export default function App() {
  return 
}
```


You can edit it directly or open it in a new tab by pressing the “Fork” button in the upper right corner.


Most pages in the React documentation contain sandboxes like this. Outside of the React documentation, there are many online sandboxes that support React: for example, CodeSandbox, StackBlitz, or CodePen.


To try React locally on your computer, download this HTML page. Open it in your editor and in your browser!


#### Creating a React App


If you want to start a new React app, you can create a React app using a recommended framework.


#### Build a React App from Scratch


If a framework is not a good fit for your project, you prefer to build your own framework, or you just want to learn the basics of a React app you can build a React app from scratch.


#### Add React to an existing project


If want to try using React in your existing app or a website, you can add React to an existing project.


###### Should I use Create React App?


No. Create React App has been deprecated. For more information, see Sunsetting Create React App.


Head to the Quick Start guide for a tour of the most important React concepts you will encounter every day.



---

## Creating a React App

**Source:** https://react.dev/learn/start-a-new-react-project

### Creating a React App


If you want to build a new app or website with React, we recommend starting with a framework.


If your app has constraints not well-served by existing frameworks, you prefer to build your own framework, or you just want to learn the basics of a React app, you can build a React app from scratch.


#### Full-stack frameworks


These recommended frameworks support all the features you need to deploy and scale your app in production. They have integrated the latest React features and take advantage of React’s architecture.


###### Full-stack frameworks do not require a server.


All the frameworks on this page support client-side rendering (CSR), single-page apps (SPA), and static-site generation (SSG). These apps can be deployed to a CDN or static hosting service without a server. Additionally, these frameworks allow you to add server-side rendering on a per-route basis, when it makes sense for your use case.


This allows you to start with a client-only app, and if your needs change later, you can opt-in to using server features on individual routes without rewriting your app. See your framework’s documentation for configuring the rendering strategy.


##### Next.js (App Router)


Next.js’s App Router is a React framework that takes full advantage of React’s architecture to enable full-stack React apps.


Next.js is maintained by Vercel. You can deploy a Next.js app to any hosting provider that supports Node.js or Docker containers, or to your own server. Next.js also supports static export which doesn’t require a server.


##### React Router (v7)


React Router is the most popular routing library for React and can be paired with Vite to create a full-stack React framework. It emphasizes standard Web APIs and has several ready to deploy templates for various JavaScript runtimes and platforms.


To create a new React Router framework project, run:


React Router is maintained by Shopify.


##### Expo (for native apps)


Expo is a React framework that lets you create universal Android, iOS, and web apps with truly native UIs. It provides an SDK for React Native that makes the native parts easier to use. To create a new Expo project, run:


If you’re new to Expo, check out the Expo tutorial.


Expo is maintained by Expo (the company). Building apps with Expo is free, and you can submit them to the Google and Apple app stores without restrictions. Expo additionally provides opt-in paid cloud services.


#### Other frameworks


There are other up-and-coming frameworks that are working towards our full stack React vision:


TanStack Start (Beta): TanStack Start is a full-stack React framework powered by TanStack Router. It provides a full-document SSR, streaming, server functions, bundling, and more using tools like Nitro and Vite.
RedwoodJS: Redwood is a full stack React framework with lots of pre-installed packages and configuration that makes it easy to build full-stack web applications.

###### Which features make up the React team’s full-stack architecture vision?


Next.js’s App Router bundler fully implements the official React Server Components specification. This lets you mix build-time, server-only, and interactive components in a single React tree.


For example, you can write a server-only React component as an async function that reads from a database or from a file. Then you can pass data down from it to your interactive components:


```
// This component runs *only* on the server (or during the build).async function Talks({ confId }) {  // 1. You're on the server, so you can talk to your data layer. API endpoint not required.  const talks = await db.Talks.findAll({ confId });  // 2. Add any amount of rendering logic. It won't make your JavaScript bundle larger.  const videos = talks.map(talk => talk.video);  // 3. Pass the data down to the components that will run in the browser.  return ;}
```


`// This component runs *only* on the server (or during the build).async function Talks({ confId }) {  // 1. You're on the server, so you can talk to your data layer. API endpoint not required.  const talks = await db.Talks.findAll({ confId });  // 2. Add any amount of rendering logic. It won't make your JavaScript bundle larger.  const videos = talks.map(talk => talk.video);  // 3. Pass the data down to the components that will run in the browser.  return ;}`
Next.js’s App Router also integrates data fetching with Suspense. This lets you specify a loading state (like a skeleton placeholder) for different parts of your user interface directly in your React tree:


```
}>  
```


`}>  `
Server Components and Suspense are React features rather than Next.js features. However, adopting them at the framework level requires buy-in and non-trivial implementation work. At the moment, the Next.js App Router is the most complete implementation. The React team is working with bundler developers to make these features easier to implement in the next generation of frameworks.


#### Start From Scratch


If your app has constraints not well-served by existing frameworks, you prefer to build your own framework, or you just want to learn the basics of a React app, there are other options available for starting a React project from scratch.


Starting from scratch gives you more flexibility, but does require that you make choices on which tools to use for routing, data fetching, and other common usage patterns.  It’s a lot like building your own framework, instead of using a framework that already exists. The frameworks we recommend have built-in solutions for these problems.


If you want to build your own solutions, see our guide to build a React app from Scratch for instructions on how to set up a new React project starting with a build tool like Vite, Parcel, or RSbuild.


If you’re a framework author interested in being included on this page, please let us know.



---

## Using TypeScript

**Source:** https://react.dev/learn/typescript

### Using TypeScript


TypeScript is a popular way to add type definitions to JavaScript codebases. Out of the box, TypeScript supports JSX and you can get full React Web support by adding @types/react and @types/react-dom to your project.


`@types/react`
`@types/react-dom`
##### You will learn


TypeScript with React Components
Examples of typing with Hooks
Common types from @types/react
Further learning locations

`@types/react`
#### Installation


All production-grade React frameworks offer support for using TypeScript. Follow the framework specific guide for installation:


Next.js
Remix
Gatsby
Expo

##### Adding TypeScript to an existing React project


To install the latest version of React’s type definitions:


The following compiler options need to be set in your tsconfig.json:


`tsconfig.json`
dom must be included in lib (Note: If no lib option is specified, dom is included by default).
jsx must be set to one of the valid options. preserve should suffice for most applications.
If you’re publishing a library, consult the jsx documentation on what value to choose.

#### TypeScript with React Components


Every file containing JSX must use the .tsx file extension. This is a TypeScript-specific extension that tells TypeScript that this file contains JSX.


Writing TypeScript with React is very similar to writing JavaScript with React. The key difference when working with a component is that you can provide types for your component’s props. These types can be used for correctness checking and providing inline documentation in editors.


Taking the MyButton component from the Quick Start guide, we can add a type describing the title for the button:


```
function MyButton({ title }: { title: string }) {
  return (
    {title}
  );
}

export default function MyApp() {
  return (
    
      ### Welcome to my app


      
    
  );
}
```


These sandboxes can handle TypeScript code, but they do not run the type-checker. This means you can amend the TypeScript sandboxes to learn, but you won’t get any type errors or warnings. To get type-checking, you can use the TypeScript Playground or use a more fully-featured online sandbox.


This inline syntax is the simplest way to provide types for a component, though once you start to have a few fields to describe it can become unwieldy. Instead, you can use an interface or type to describe the component’s props:


```
interface MyButtonProps {
  /** The text to display inside the button */
  title: string;
  /** Whether the button can be interacted with */
  disabled: boolean;
}

function MyButton({ title, disabled }: MyButtonProps) {
  return (
    {title}
  );
}

export default function MyApp() {
  return (
    
      ### Welcome to my app


      
    
  );
}
```


The type describing your component’s props can be as simple or as complex as you need, though they should be an object type described with either a type or interface. You can learn about how TypeScript describes objects in Object Types but you may also be interested in using Union Types to describe a prop that can be one of a few different types and the Creating Types from Types guide for more advanced use cases.


#### Example Hooks


The type definitions from @types/react include types for the built-in Hooks, so you can use them in your components without any additional setup. They are built to take into account the code you write in your component, so you will get inferred types a lot of the time and ideally do not need to handle the minutiae of providing the types.


`@types/react`
However, we can look at a few examples of how to provide types for Hooks.


The useState Hook will re-use the value passed in as the initial state to determine what the type of the value should be. For example:


```
// Infer the type as "boolean"const [enabled, setEnabled] = useState(false);
```


`// Infer the type as "boolean"const [enabled, setEnabled] = useState(false);`
This will assign the type of boolean to enabled, and setEnabled will be a function accepting either a boolean argument, or a function that returns a boolean. If you want to explicitly provide a type for the state, you can do so by providing a type argument to the useState call:


```
// Explicitly set the type to "boolean"const [enabled, setEnabled] = useState(false);
```


`// Explicitly set the type to "boolean"const [enabled, setEnabled] = useState(false);`
This isn’t very useful in this case, but a common case where you may want to provide a type is when you have a union type. For example, status here can be one of a few different strings:


```
type Status = "idle" | "loading" | "success" | "error";const [status, setStatus] = useState("idle");
```


`type Status = "idle" | "loading" | "success" | "error";const [status, setStatus] = useState("idle");`
Or, as recommended in Principles for structuring state, you can group related state as an object and describe the different possibilities via object types:


```
type RequestState =  | { status: 'idle' }  | { status: 'loading' }  | { status: 'success', data: any }  | { status: 'error', error: Error };const [requestState, setRequestState] = useState({ status: 'idle' });
```


`type RequestState =  | { status: 'idle' }  | { status: 'loading' }  | { status: 'success', data: any }  | { status: 'error', error: Error };const [requestState, setRequestState] = useState({ status: 'idle' });`
The useReducer Hook is a more complex Hook that takes a reducer function and an initial state. The types for the reducer function are inferred from the initial state. You can optionally provide a type argument to the useReducer call to provide a type for the state, but it is often better to set the type on the initial state instead:


```
import {useReducer} from 'react';

interface State {
   count: number
};

type CounterAction =
  | { type: "reset" }
  | { type: "setCount"; value: State["count"] }

const initialState: State = { count: 0 };

function stateReducer(state: State, action: CounterAction): State {
  switch (action.type) {
    case "reset":
      return initialState;
    case "setCount":
      return { ...state, count: action.value };
    default:
      throw new Error("Unknown action");
  }
}

export default function App() {
  const [state, dispatch] = useReducer(stateReducer, initialState);

  const addFive = () => dispatch({ type: "setCount", value: state.count + 5 });
  const reset = () => dispatch({ type: "reset" });

  return (
    
      ### Welcome to my counter



      Count: {state.count}


      Add 5
      Reset
    
  );
}
```


We are using TypeScript in a few key places:


interface State describes the shape of the reducer’s state.
type CounterAction describes the different actions which can be dispatched to the reducer.
const initialState: State provides a type for the initial state, and also the type which is used by useReducer by default.
stateReducer(state: State, action: CounterAction): State sets the types for the reducer function’s arguments and return value.

`interface State`
`type CounterAction`
`const initialState: State`
`stateReducer(state: State, action: CounterAction): State`
A more explicit alternative to setting the type on initialState is to provide a type argument to useReducer:


`initialState`

---

## Describing the UI

**Source:** https://react.dev/learn/describing-the-ui

### Describing the UI


React is a JavaScript library for rendering user interfaces (UI). UI is built from small units like buttons, text, and images. React lets you combine them into reusable, nestable components. From web sites to phone apps, everything on the screen can be broken down into components. In this chapter, you’ll learn to create, customize, and conditionally display React components.


##### In this chapter


How to write your first React component
When and how to create multi-component files
How to add markup to JavaScript with JSX
How to use curly braces with JSX to access JavaScript functionality from your components
How to configure components with props
How to conditionally render components
How to render multiple components at a time
How to avoid confusing bugs by keeping components pure
Why understanding your UI as trees is useful

#### Your first component


React applications are built from isolated pieces of UI called components. A React component is a JavaScript function that you can sprinkle with markup. Components can be as small as a button, or as large as an entire page. Here is a Gallery component rendering three Profile components:


```
function Profile() {
  return (
    
  );
}

export default function Gallery() {
  return (
    
      ### Amazing scientists


      
      
      
    
  );
}
```


#### Ready to learn this topic?


Read Your First Component to learn how to declare and use React components.


#### Importing and exporting components


You can declare many components in one file, but large files can get difficult to navigate. To solve this, you can export a component into its own file, and then import that component from another file:


```
import Profile from './Profile.js';

export default function Gallery() {
  return (
    
      ### Amazing scientists


      
      
      
    
  );
}
```


#### Ready to learn this topic?


Read Importing and Exporting Components to learn how to split components into their own files.


#### Writing markup with JSX


Each React component is a JavaScript function that may contain some markup that React renders into the browser. React components use a syntax extension called JSX to represent that markup. JSX looks a lot like HTML, but it is a bit stricter and can display dynamic information.


If we paste existing HTML markup into a React component, it won’t always work:


```
export default function TodoList() {
  return (
    // This doesn't quite work!
    ### Hedy Lamarr's Todos


    
    
      Invent new traffic lights
      Rehearse a movie scene
      Improve spectrum technology
    

```


If you have existing HTML like this, you can fix it using a converter:


```
export default function TodoList() {
  return (
    <>
      ### Hedy Lamarr's Todos


      
      
        Invent new traffic lights
        Rehearse a movie scene
        Improve spectrum technology
      

    
  );
}
```


#### Ready to learn this topic?


Read Writing Markup with JSX to learn how to write valid JSX.


#### JavaScript in JSX with curly braces


JSX lets you write HTML-like markup inside a JavaScript file, keeping rendering logic and content in the same place. Sometimes you will want to add a little JavaScript logic or reference a dynamic property inside that markup. In this situation, you can use curly braces in your JSX to “open a window” to JavaScript:


```
const person = {
  name: 'Gregorio Y. Zara',
  theme: {
    backgroundColor: 'black',
    color: 'pink'
  }
};

export default function TodoList() {
  return (
    
      ### {person.name}'s Todos


      
      
        Improve the videophone
        Prepare aeronautics lectures
        Work on the alcohol-fuelled engine
      

    
  );
}
```


#### Ready to learn this topic?


Read JavaScript in JSX with Curly Braces to learn how to access JavaScript data from JSX.


#### Passing props to a component


React components use props to communicate with each other. Every parent component can pass some information to its child components by giving them props. Props might remind you of HTML attributes, but you can pass any JavaScript value through them, including objects, arrays, functions, and even JSX!


```
import { getImageUrl } from './utils.js'

export default function Profile() {
  return (
    
      
    
  );
}

function Avatar({ person, size }) {
  return (
    
  );
}

function Card({ children }) {
  return (
    
      {children}
    
  );
}
```


#### Ready to learn this topic?


Read Passing Props to a Component to learn how to pass and read props.


#### Conditional rendering


Your components will often need to display different things depending on different conditions. In React, you can conditionally render JSX using JavaScript syntax like if statements, &&, and ? : operators.


In this example, the JavaScript && operator is used to conditionally render a checkmark:


```
function Item({ name, isPacked }) {
  return (
    
      {name} {isPacked && '✅'}
    
  );
}

export default function PackingList() {
  return (
    
      ### Sally Ride's Packing List


      
        
        
        
      

    
  );
}
```


#### Ready to learn this topic?


Read Conditional Rendering to learn the different ways to render content conditionally.


#### Rendering lists


You will often want to display multiple similar components from a collection of data. You can use JavaScript’s filter() and map() with React to filter and transform your array of data into an array of components.


For each array item, you will need to specify a key. Usually, you will want to use an ID from the database as a key. Keys let React keep track of each item’s place in the list even if the list changes.


```
import { people } from './data.js';
import { getImageUrl } from './utils.js';

export default function List() {
  const listItems = people.map(person =>
    
      
      
        {person.name}:
        {' ' + person.profession + ' '}
        known for {person.accomplishment}
      


    
  );
  return (
    
      ### Scientists


      {listItems}

    
  );
}
```


#### Ready to learn this topic?


Read Rendering Lists to learn how to render a list of components, and how to choose a key.


#### Keeping components pure


Some JavaScript functions are pure. A pure function:


Minds its own business. It does not change any objects or variables that existed before it was called.
Same inputs, same output. Given the same inputs, a pure function should always return the same result.

By strictly only writing your components as pure functions, you can avoid an entire class of baffling bugs and unpredictable behavior as your codebase grows. Here is an example of an impure component:


```
let guest = 0;

function Cup() {
  // Bad: changing a preexisting variable!
  guest = guest + 1;
  return #### Tea cup for guest #{guest}

;
}

export default function TeaSet() {
  return (
    <>
      
      
      
    
  );
}
```


You can make this component pure by passing a prop instead of modifying a preexisting variable:



---

## Adding Interactivity

**Source:** https://react.dev/learn/adding-interactivity

### Adding Interactivity


Some things on the screen update in response to user input. For example, clicking an image gallery switches the active image. In React, data that changes over time is called state. You can add state to any component, and update it as needed. In this chapter, you’ll learn how to write components that handle interactions, update their state, and display different output over time.


##### In this chapter


How to handle user-initiated events
How to make components “remember” information with state
How React updates the UI in two phases
Why state doesn’t update right after you change it
How to queue multiple state updates
How to update an object in state
How to update an array in state

#### Responding to events


React lets you add event handlers to your JSX. Event handlers are your own functions that will be triggered in response to user interactions like clicking, hovering, focusing on form inputs, and so on.


Built-in components like  only support built-in browser events like onClick. However, you can also create your own components, and give their event handler props any application-specific names that you like.


```
export default function App() {
  return (
     alert('Playing!')}
      onUploadImage={() => alert('Uploading!')}
    />
  );
}

function Toolbar({ onPlayMovie, onUploadImage }) {
  return (
    
      
        Play Movie
      
      
        Upload Image
      
    
  );
}

function Button({ onClick, children }) {
  return (
    
      {children}
    
  );
}
```


#### Ready to learn this topic?


Read Responding to Events to learn how to add event handlers.


#### State: a component’s memory


Components often need to change what’s on the screen as a result of an interaction. Typing into the form should update the input field, clicking “next” on an image carousel should change which image is displayed, clicking “buy” puts a product in the shopping cart. Components need to “remember” things: the current input value, the current image, the shopping cart. In React, this kind of component-specific memory is called state.


You can add state to a component with a useState Hook. Hooks are special functions that let your components use React features (state is one of those features). The useState Hook lets you declare a state variable. It takes the initial state and returns a pair of values: the current state, and a state setter function that lets you update it.


```
const [index, setIndex] = useState(0);const [showMore, setShowMore] = useState(false);
```


`const [index, setIndex] = useState(0);const [showMore, setShowMore] = useState(false);`
Here is how an image gallery uses and updates state on click:


```
import { useState } from 'react';
import { sculptureList } from './data.js';

export default function Gallery() {
  const [index, setIndex] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const hasNext = index 
      
        Next
      
      #### 
        {sculpture.name} 
        by {sculpture.artist}
      


      ##### 
        ({index + 1} of {sculptureList.length})
      


      
        {showMore ? 'Hide' : 'Show'} details
      
      {showMore && {sculpture.description}

}
      
    
  );
}
```


#### Ready to learn this topic?


Read State: A Component’s Memory to learn how to remember a value and update it on interaction.


#### Render and commit


Before your components are displayed on the screen, they must be rendered by React. Understanding the steps in this process will help you think about how your code executes and explain its behavior.


Imagine that your components are cooks in the kitchen, assembling tasty dishes from ingredients. In this scenario, React is the waiter who puts in requests from customers and brings them their orders. This process of requesting and serving UI has three steps:


Triggering a render (delivering the diner’s order to the kitchen)
Rendering the component (preparing the order in the kitchen)
Committing to the DOM (placing the order on the table)

TriggerRenderCommit

Illustrated by Rachel Lee Nabors


#### Ready to learn this topic?


Read Render and Commit to learn the lifecycle of a UI update.


#### State as a snapshot


Unlike regular JavaScript variables, React state behaves more like a snapshot. Setting it does not change the state variable you already have, but instead triggers a re-render. This can be surprising at first!


```
console.log(count);  // 0setCount(count + 1); // Request a re-render with 1console.log(count);  // Still 0!
```


`console.log(count);  // 0setCount(count + 1); // Request a re-render with 1console.log(count);  // Still 0!`
This behavior helps you avoid subtle bugs. Here is a little chat app. Try to guess what happens if you press “Send” first and then change the recipient to Bob. Whose name will appear in the alert five seconds later?


```
import { useState } from 'react';

export default function Form() {
  const [to, setTo] = useState('Alice');
  const [message, setMessage] = useState('Hello');

  function handleSubmit(e) {
    e.preventDefault();
    setTimeout(() => {
      alert(`You said ${message} to ${to}`);
    }, 5000);
  }

  return (
    
      
        To:{' '}
         setTo(e.target.value)}>
          Alice
          Bob
        
      
       setMessage(e.target.value)}
      />
      Send
    
  );
}
```


#### Ready to learn this topic?


Read State as a Snapshot to learn why state appears “fixed” and unchanging inside the event handlers.


#### Queueing a series of state updates


This component is buggy: clicking “+3” increments the score only once.


```
import { useState } from 'react';

export default function Counter() {
  const [score, setScore] = useState(0);

  function increment() {
    setScore(score + 1);
  }

  return (
    <>
       increment()}>+1
       {
        increment();
        increment();
        increment();
      }}>+3
      ### Score: {score}


    
  )
}
```


State as a Snapshot explains why this is happening. Setting state requests a new re-render, but does not change it in the already running code. So score continues to be 0 right after you call setScore(score + 1).


`setScore(score + 1)`
```
console.log(score);  // 0setScore(score + 1); // setScore(0 + 1);console.log(score);  // 0setScore(score + 1); // setScore(0 + 1);console.log(score);  // 0setScore(score + 1); // setScore(0 + 1);console.log(score);  // 0
```


`console.log(score);  // 0setScore(score + 1); // setScore(0 + 1);console.log(score);  // 0setScore(score + 1); // setScore(0 + 1);console.log(score);  // 0setScore(score + 1); // setScore(0 + 1);console.log(score);  // 0`
You can fix this by passing an updater function when setting state. Notice how replacing setScore(score + 1) with setScore(s => s + 1) fixes the “+3” button. This lets you queue multiple state updates.


`setScore(score + 1)`
`setScore(s => s + 1)`
```
import { useState } from 'react';

export default function Counter() {
  const [score, setScore] = useState(0);

  function increment() {
    setScore(s => s + 1);
  }

  return (
    <>
       increment()}>+1
       {
        increment();
        increment();
        increment();
      }}>+3
      ### Score: {score}


    
  )
}
```


#### Ready to learn this topic?


Read Queueing a Series of State Updates to learn how to queue a sequence of state updates.


#### Updating objects in state


State can hold any kind of JavaScript value, including objects. But you shouldn’t change objects and arrays that you hold in the React state directly. Instead, when you want to update an object and array, you need to create a new one (or make a copy of an existing one), and then update the state to use that copy.



---

## Managing State

**Source:** https://react.dev/learn/managing-state

### Managing State


As your application grows, it helps to be more intentional about how your state is organized and how the data flows between your components. Redundant or duplicate state is a common source of bugs. In this chapter, you’ll learn how to structure your state well, how to keep your state update logic maintainable, and how to share state between distant components.


##### In this chapter


How to think about UI changes as state changes
How to structure state well
How to “lift state up” to share it between components
How to control whether the state gets preserved or reset
How to consolidate complex state logic in a function
How to pass information without “prop drilling”
How to scale state management as your app grows

#### Reacting to input with state


With React, you won’t modify the UI from code directly. For example, you won’t write commands like “disable the button”, “enable the button”, “show the success message”, etc. Instead, you will describe the UI you want to see for the different visual states of your component (“initial state”, “typing state”, “success state”), and then trigger the state changes in response to user input. This is similar to how designers think about UI.


Here is a quiz form built using React. Note how it uses the status state variable to determine whether to enable or disable the submit button, and whether to show the success message instead.


```
import { useState } from 'react';

export default function Form() {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('typing');

  if (status === 'success') {
    return ### That's right!


  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    try {
      await submitForm(answer);
      setStatus('success');
    } catch (err) {
      setStatus('typing');
      setError(err);
    }
  }

  function handleTextareaChange(e) {
    setAnswer(e.target.value);
  }

  return (
    <>
      #### City quiz


      
        In which city is there a billboard that turns air into drinkable water?
      


      
        
        
        
          Submit
        
        {error !== null &&
          
            {error.message}
          


        }
      
    
  );
}

function submitForm(answer) {
  // Pretend it's hitting the network.
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      let shouldError = answer.toLowerCase() !== 'lima'
      if (shouldError) {
        reject(new Error('Good guess but a wrong answer. Try again!'));
      } else {
        resolve();
      }
    }, 1500);
  });
}
```


#### Ready to learn this topic?


Read Reacting to Input with State to learn how to approach interactions with a state-driven mindset.


#### Choosing the state structure


Structuring state well can make a difference between a component that is pleasant to modify and debug, and one that is a constant source of bugs. The most important principle is that state shouldn’t contain redundant or duplicated information. If there’s unnecessary state, it’s easy to forget to update it, and introduce bugs!


For example, this form has a redundant fullName state variable:


```
import { useState } from 'react';

export default function Form() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fullName, setFullName] = useState('');

  function handleFirstNameChange(e) {
    setFirstName(e.target.value);
    setFullName(e.target.value + ' ' + lastName);
  }

  function handleLastNameChange(e) {
    setLastName(e.target.value);
    setFullName(firstName + ' ' + e.target.value);
  }

  return (
    <>
      #### Let’s check you in


      
        First name:{' '}
        
      
      
        Last name:{' '}
        
      
      
        Your ticket will be issued to: {fullName}
      


    
  );
}
```


You can remove it and simplify the code by calculating fullName while the component is rendering:


```
import { useState } from 'react';

export default function Form() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const fullName = firstName + ' ' + lastName;

  function handleFirstNameChange(e) {
    setFirstName(e.target.value);
  }

  function handleLastNameChange(e) {
    setLastName(e.target.value);
  }

  return (
    <>
      #### Let’s check you in


      
        First name:{' '}
        
      
      
        Last name:{' '}
        
      
      
        Your ticket will be issued to: {fullName}
      


    
  );
}
```


This might seem like a small change, but many bugs in React apps are fixed this way.


#### Ready to learn this topic?


Read Choosing the State Structure to learn how to design the state shape to avoid bugs.


#### Sharing state between components


Sometimes, you want the state of two components to always change together. To do it, remove state from both of them, move it to their closest common parent, and then pass it down to them via props. This is known as “lifting state up”, and it’s one of the most common things you will do writing React code.


In this example, only one panel should be active at a time. To achieve this, instead of keeping the active state inside each individual panel, the parent component holds the state and specifies the props for its children.


```
import { useState } from 'react';

export default function Accordion() {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <>
      #### Almaty, Kazakhstan


       setActiveIndex(0)}
      >
        With a population of about 2 million, Almaty is Kazakhstan's largest city. From 1929 to 1997, it was its capital city.
      
       setActiveIndex(1)}
      >
        The name comes from алма, the Kazakh word for "apple" and is often translated as "full of apples". In fact, the region surrounding Almaty is thought to be the ancestral home of the apple, and the wild Malus sieversii is considered a likely candidate for the ancestor of the modern domestic apple.
      
    
  );
}

function Panel({
  title,
  children,
  isActive,
  onShow
}) {
  return (
    
      ##### {title}


      {isActive ? (
        {children}


      ) : (
        
          Show
        
      )}
    
  );
}
```


#### Ready to learn this topic?


Read Sharing State Between Components to learn how to lift state up and keep components in sync.


#### Preserving and resetting state


When you re-render a component, React needs to decide which parts of the tree to keep (and update), and which parts to discard or re-create from scratch. In most cases, React’s automatic behavior works well enough. By default, React preserves the parts of the tree that “match up” with the previously rendered component tree.


However, sometimes this is not what you want. In this chat app, typing a message and then switching the recipient does not reset the input. This can make the user accidentally send a message to the wrong person:


```
import { useState } from 'react';
import Chat from './Chat.js';
import ContactList from './ContactList.js';

export default function Messenger() {
  const [to, setTo] = useState(contacts[0]);
  return (
    
       setTo(contact)}
      />
      
    
  )
}

const contacts = [
  { name: 'Taylor', email: 'taylor@mail.com' },
  { name: 'Alice', email: 'alice@mail.com' },
  { name: 'Bob', email: 'bob@mail.com' }
];
```


React lets you override the default behavior, and force a component to reset its state by passing it a different key, like . This tells React that if the recipient is different, it should be considered a different Chat component that needs to be re-created from scratch with the new data (and UI like inputs). Now switching between the recipients resets the input field—even though you render the same component.


``
```
import { useState } from 'react';
import Chat from './Chat.js';
import ContactList from './ContactList.js';

export default function Messenger() {
  const [to, setTo] = useState(contacts[0]);
  return (
    
       setTo(contact)}
      />
      
    
  )
}

const contacts = [
  { name: 'Taylor', email: 'taylor@mail.com' },
  { name: 'Alice', email: 'alice@mail.com' },
  { name: 'Bob', email: 'bob@mail.com' }
];
```


#### Ready to learn this topic?


Read Preserving and Resetting State to learn the lifetime of state and how to control it.


#### Extracting state logic into a reducer


Components with many state updates spread across many event handlers can get overwhelming. For these cases, you can consolidate all the state update logic outside your component in a single function, called “reducer”. Your event handlers become concise because they only specify the user “actions”. At the bottom of the file, the reducer function specifies how the state should update in response to each action!


```
import { useReducer } from 'react';
import AddTask from './AddTask.js';
import TaskList from './TaskList.js';

export default function TaskApp() {
  const [tasks, dispatch] = useReducer(
    tasksReducer,
    initialTasks
  );

  function handleAddTask(text) {
    dispatch({
      type: 'added',
      id: nextId++,
      text: text,
    });
  }

  function handleChangeTask(task) {
    dispatch({
      type: 'changed',
      task: task
    });
  }

  function handleDeleteTask(taskId) {
    dispatch({
      type: 'deleted',
      id: taskId
    });
  }

  return (
    <>
      ### Prague itinerary


      
      
    
  );
}

function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'added': {
      return [...tasks, {
        id: action.id,
        text: action.text,
        done: false
      }];
    }
    case 'changed': {
      return tasks.map(t => {
        if (t.id === action.task.id) {
          return action.task;
        } else {
          return t;
        }
      });
    }
    case 'deleted': {
      return tasks.filter(t => t.id !== action.id);
    }
    default: {
      throw Error('Unknown action: ' + action.type);
    }
  }
}

let nextId = 3;
const initialTasks = [
  { id: 0, text: 'Visit Kafka Museum', done: true },
  { id: 1, text: 'Watch a puppet show', done: false },
  { id: 2, text: 'Lennon Wall pic', done: false }
];
```


#### Ready to learn this topic?


Read Extracting State Logic into a Reducer to learn how to consolidate logic in the reducer function.


#### Passing data deeply with context


Usually, you will pass information from a parent component to a child component via props. But passing props can become inconvenient if you need to pass some prop through many components, or if many components need the same information. Context lets the parent component make some information available to any component in the tree below it—no matter how deep it is—without passing it explicitly through props.


Here, the Heading component determines its heading level by “asking” the closest Section for its level. Each Section tracks its own level by asking the parent Section and adding one to it. Every Section provides information to all components below it without passing props—it does that through context.


```
import Heading from './Heading.js';
import Section from './Section.js';

export default function Page() {
  return (
    
      Title
      
        Heading
        Heading
        Heading
        
          Sub-heading
          Sub-heading
          Sub-heading
          
            Sub-sub-heading
            Sub-sub-heading
            Sub-sub-heading
          
        
      
    
  );
}
```


#### Ready to learn this topic?


Read Passing Data Deeply with Context to learn about using context as an alternative to passing props.


#### Scaling up with reducer and context


Reducers let you consolidate a component’s state update logic. Context lets you pass information deep down to other components. You can combine reducers and context together to manage state of a complex screen.


With this approach, a parent component with complex state manages it with a reducer. Other components anywhere deep in the tree can read its state via context. They can also dispatch actions to update that state.


```
import AddTask from './AddTask.js';
import TaskList from './TaskList.js';
import { TasksProvider } from './TasksContext.js';

export default function TaskApp() {
  return (
    
      ### Day off in Kyoto


      
      
    
  );
}
```


#### Ready to learn this topic?



---

## Escape Hatches

**Source:** https://react.dev/learn/escape-hatches

### Escape Hatches


Some of your components may need to control and synchronize with systems outside of React. For example, you might need to focus an input using the browser API, play and pause a video player implemented without React, or connect and listen to messages from a remote server. In this chapter, you’ll learn the escape hatches that let you “step outside” React and connect to external systems. Most of your application logic and data flow should not rely on these features.


##### In this chapter


How to “remember” information without re-rendering
How to access DOM elements managed by React
How to synchronize components with external systems
How to remove unnecessary Effects from your components
How an Effect’s lifecycle is different from a component’s
How to prevent some values from re-triggering Effects
How to make your Effect re-run less often
How to share logic between components

#### Referencing values with refs


When you want a component to “remember” some information, but you don’t want that information to trigger new renders, you can use a ref:


```
const ref = useRef(0);
```


`const ref = useRef(0);`
Like state, refs are retained by React between re-renders. However, setting state re-renders a component. Changing a ref does not! You can access the current value of that ref through the ref.current property.


`ref.current`
```
import { useRef } from 'react';

export default function Counter() {
  let ref = useRef(0);

  function handleClick() {
    ref.current = ref.current + 1;
    alert('You clicked ' + ref.current + ' times!');
  }

  return (
    
      Click me!
    
  );
}
```


A ref is like a secret pocket of your component that React doesn’t track. For example, you can use refs to store timeout IDs, DOM elements, and other objects that don’t impact the component’s rendering output.


#### Ready to learn this topic?


Read Referencing Values with Refs to learn how to use refs to remember information.


#### Manipulating the DOM with refs


React automatically updates the DOM to match your render output, so your components won’t often need to manipulate it. However, sometimes you might need access to the DOM elements managed by React—for example, to focus a node, scroll to it, or measure its size and position. There is no built-in way to do those things in React, so you will need a ref to the DOM node. For example, clicking the button will focus the input using a ref:


```
import { useRef } from 'react';

export default function Form() {
  const inputRef = useRef(null);

  function handleClick() {
    inputRef.current.focus();
  }

  return (
    <>
      
      
        Focus the input
      
    
  );
}
```


#### Ready to learn this topic?


Read Manipulating the DOM with Refs to learn how to access DOM elements managed by React.


#### Synchronizing with Effects


Some components need to synchronize with external systems. For example, you might want to control a non-React component based on the React state, set up a server connection, or send an analytics log when a component appears on the screen. Unlike event handlers, which let you handle particular events, Effects let you run some code after rendering. Use them to synchronize your component with a system outside of React.


Press Play/Pause a few times and see how the video player stays synchronized to the isPlaying prop value:


```
import { useState, useRef, useEffect } from 'react';

function VideoPlayer({ src, isPlaying }) {
  const ref = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      ref.current.play();
    } else {
      ref.current.pause();
    }
  }, [isPlaying]);

  return ;
}

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <>
       setIsPlaying(!isPlaying)}>
        {isPlaying ? 'Pause' : 'Play'}
      
      
    
  );
}
```


Many Effects also “clean up” after themselves. For example, an Effect that sets up a connection to a chat server should return a cleanup function that tells React how to disconnect your component from that server:


```
import { useState, useEffect } from 'react';
import { createConnection } from './chat.js';

export default function ChatRoom() {
  useEffect(() => {
    const connection = createConnection();
    connection.connect();
    return () => connection.disconnect();
  }, []);
  return ### Welcome to the chat!

;
}
```


In development, React will immediately run and clean up your Effect one extra time. This is why you see "✅ Connecting..." printed twice. This ensures that you don’t forget to implement the cleanup function.


`"✅ Connecting..."`
#### Ready to learn this topic?


Read Synchronizing with Effects to learn how to synchronize components with external systems.


#### You Might Not Need An Effect


Effects are an escape hatch from the React paradigm. They let you “step outside” of React and synchronize your components with some external system. If there is no external system involved (for example, if you want to update a component’s state when some props or state change), you shouldn’t need an Effect. Removing unnecessary Effects will make your code easier to follow, faster to run, and less error-prone.


There are two common cases in which you don’t need Effects:


You don’t need Effects to transform data for rendering.
You don’t need Effects to handle user events.

For example, you don’t need an Effect to adjust some state based on other state:


```
function Form() {  const [firstName, setFirstName] = useState('Taylor');  const [lastName, setLastName] = useState('Swift');  // 🔴 Avoid: redundant state and unnecessary Effect  const [fullName, setFullName] = useState('');  useEffect(() => {    setFullName(firstName + ' ' + lastName);  }, [firstName, lastName]);  // ...}
```


`function Form() {  const [firstName, setFirstName] = useState('Taylor');  const [lastName, setLastName] = useState('Swift');  // 🔴 Avoid: redundant state and unnecessary Effect  const [fullName, setFullName] = useState('');  useEffect(() => {    setFullName(firstName + ' ' + lastName);  }, [firstName, lastName]);  // ...}`
Instead, calculate as much as you can while rendering:


```
function Form() {  const [firstName, setFirstName] = useState('Taylor');  const [lastName, setLastName] = useState('Swift');  // ✅ Good: calculated during rendering  const fullName = firstName + ' ' + lastName;  // ...}
```


`function Form() {  const [firstName, setFirstName] = useState('Taylor');  const [lastName, setLastName] = useState('Swift');  // ✅ Good: calculated during rendering  const fullName = firstName + ' ' + lastName;  // ...}`
However, you do need Effects to synchronize with external systems.


#### Ready to learn this topic?


Read You Might Not Need an Effect to learn how to remove unnecessary Effects.


#### Lifecycle of reactive effects


Effects have a different lifecycle from components. Components may mount, update, or unmount. An Effect can only do two things: to start synchronizing something, and later to stop synchronizing it. This cycle can happen multiple times if your Effect depends on props and state that change over time.


This Effect depends on the value of the roomId prop. Props are reactive values, which means they can change on a re-render. Notice that the Effect re-synchronizes (and re-connects to the server) if roomId changes:


```
import { useState, useEffect } from 'react';
import { createConnection } from './chat.js';

const serverUrl = 'https://localhost:1234';

function ChatRoom({ roomId }) {
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);

  return ### Welcome to the {roomId} room!

;
}

export default function App() {
  const [roomId, setRoomId] = useState('general');
  return (
    <>
      
        Choose the chat room:{' '}
         setRoomId(e.target.value)}
        >
          general
          travel
          music
        
      
      
      
    
  );
}
```


React provides a linter rule to check that you’ve specified your Effect’s dependencies correctly. If you forget to specify roomId in the list of dependencies in the above example, the linter will find that bug automatically.


#### Ready to learn this topic?


Read Lifecycle of Reactive Events to learn how an Effect’s lifecycle is different from a component’s.


#### Separating events from Effects



---

## React Reference Overview

**Source:** https://react.dev/reference/react

### React Reference Overview


This section provides detailed reference documentation for working with React. For an introduction to React, please visit the Learn section.


The React reference documentation is broken down into functional subsections:


Programmatic React features:


Hooks - Use different React features from your components.
Components - Built-in components that you can use in your JSX.
APIs - APIs that are useful for defining components.
Directives - Provide instructions to bundlers compatible with React Server Components.

React-dom contains features that are only supported for web applications (which run in the browser DOM environment). This section is broken into the following:


Hooks - Hooks for web applications which run in the browser DOM environment.
Components - React supports all of the browser built-in HTML and SVG components.
APIs - The react-dom package contains methods supported only in web applications.
Client APIs - The react-dom/client APIs let you render React components on the client (in the browser).
Server APIs - The react-dom/server APIs let you render React components to HTML on the server.

`react-dom/client`
`react-dom/server`
#### React Compiler


The React Compiler is a build-time optimization tool that automatically memoizes your React components and values:


Configuration - Configuration options for React Compiler.
Directives - Function-level directives to control compilation.
Compiling Libraries - Guide for shipping pre-compiled library code.

#### Rules of React


React has idioms — or rules — for how to express patterns in a way that is easy to understand and yields high-quality applications:


Components and Hooks must be pure – Purity makes your code easier to understand, debug, and allows React to automatically optimize your components and hooks correctly.
React calls Components and Hooks – React is responsible for rendering components and hooks when necessary to optimize the user experience.
Rules of Hooks – Hooks are defined using JavaScript functions, but they represent a special type of reusable UI logic with restrictions on where they can be called.

#### Legacy APIs


Legacy APIs - Exported from the react package, but not recommended for use in newly written code.


---

## React DOM APIs

**Source:** https://react.dev/reference/react-dom

### React DOM APIs


The react-dom package contains methods that are only supported for the web applications (which run in the browser DOM environment). They are not supported for React Native.


These APIs can be imported from your components. They are rarely used:


createPortal lets you render child components in a different part of the DOM tree.
flushSync lets you force React to flush a state update and update the DOM synchronously.

`createPortal`
#### Resource Preloading APIs


These APIs can be used to make apps faster by pre-loading resources such as scripts, stylesheets, and fonts as soon as you know you need them, for example before navigating to another page where the resources will be used.


React-based frameworks frequently handle resource loading for you, so you might not have to call these APIs yourself. Consult your framework’s documentation for details.


prefetchDNS lets you prefetch the IP address of a DNS domain name that you expect to connect to.
preconnect lets you connect to a server you expect to request resources from, even if you don’t know what resources you’ll need yet.
preload lets you fetch a stylesheet, font, image, or external script that you expect to use.
preloadModule lets you fetch an ESM module that you expect to use.
preinit lets you fetch and evaluate an external script or fetch and insert a stylesheet.
preinitModule lets you fetch and evaluate an ESM module.

`prefetchDNS`
`preloadModule`
`preinitModule`
#### Entry points


The react-dom package provides two additional entry points:


react-dom/client contains APIs to render React components on the client (in the browser).
react-dom/server contains APIs to render React components on the server.

`react-dom/client`
`react-dom/server`
#### Removed APIs


These APIs were removed in React 19:


findDOMNode: see alternatives.
hydrate: use hydrateRoot instead.
render: use createRoot instead.
unmountComponentAtNode: use root.unmount() instead.
renderToNodeStream: use react-dom/server APIs instead.
renderToStaticNodeStream: use react-dom/server APIs instead.

`findDOMNode`
`hydrateRoot`
`unmountComponentAtNode`
`root.unmount()`
`renderToNodeStream`
`react-dom/server`
`renderToStaticNodeStream`
`react-dom/server`

---

