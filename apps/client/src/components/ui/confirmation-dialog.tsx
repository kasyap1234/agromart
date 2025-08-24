'use client'

import * as React from 'react'
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConfirmationDialogProps {
  children: React.ReactNode
  title: string
  description: string
  actionText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'success'
  onConfirm: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
}

export function ConfirmationDialog({
  children,
  title,
  description,
  actionText = 'Continue',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
  loading = false,
  disabled = false,
}: ConfirmationDialogProps) {
  const [open, setOpen] = React.useState(false)

  const handleConfirm = async () => {
    try {
      await onConfirm()
      setOpen(false)
    } catch (error) {
      // Error handling is typically done in the parent component
      console.error('Confirmation action failed:', error)
    }
  }

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <AlertTriangle className="h-6 w-6 text-destructive" />
      case 'success':
        return <CheckCircle className="h-6 w-6 text-success" />
      default:
        return <Info className="h-6 w-6 text-primary" />
    }
  }

  const getButtonVariant = () => {
    switch (variant) {
      case 'destructive':
        return 'destructive'
      case 'success':
        return 'success'
      default:
        return 'default'
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              variant === 'success' && 'bg-success text-success-foreground hover:bg-success/90'
            )}
          >
            {loading ? 'Loading...' : actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Pre-configured delete confirmation dialog
interface DeleteConfirmationDialogProps {
  children: React.ReactNode
  itemName: string
  itemType?: string
  onDelete: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
}

export function DeleteConfirmationDialog({
  children,
  itemName,
  itemType = 'item',
  onDelete,
  loading = false,
  disabled = false,
}: DeleteConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      title={`Delete ${itemType}`}
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      actionText="Delete"
      variant="destructive"
      onConfirm={onDelete}
      loading={loading}
      disabled={disabled}
    >
      {children}
    </ConfirmationDialog>
  )
}

// Bulk delete confirmation dialog
interface BulkDeleteConfirmationDialogProps {
  children: React.ReactNode
  count: number
  itemType?: string
  onDelete: () => void | Promise<void>
  loading?: boolean
  disabled?: boolean
}

export function BulkDeleteConfirmationDialog({
  children,
  count,
  itemType = 'items',
  onDelete,
  loading = false,
  disabled = false,
}: BulkDeleteConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      title={`Delete ${count} ${itemType}`}
      description={`Are you sure you want to delete ${count} ${itemType}? This action cannot be undone.`}
      actionText={`Delete ${count} ${itemType}`}
      variant="destructive"
      onConfirm={onDelete}
      loading={loading}
      disabled={disabled}
    >
      {children}
    </ConfirmationDialog>
  )
}
