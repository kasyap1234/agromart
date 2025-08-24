import { Plus, ArrowUp, FileText } from 'lucide-react';

export const activityVariants = {
  product_added: {
    icon: Plus,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    description: (log: any) => `Added ${log.quantity_change} units of ${log.product_name || 'Unknown Product'}${log.batch_number ? ` (Batch: ${log.batch_number})` : ''}`,
  },
  inventory_updated: {
    icon: ArrowUp,
    color: 'bg-primary/10 text-primary',
    description: (log: any) => `Removed ${Math.abs(log.quantity_change)} units of ${log.product_name || 'Unknown Product'}${log.batch_number ? ` (Batch: ${log.batch_number})` : ''}`,
  },
  order_created: {
    icon: FileText,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    description: (log: any) => `Order created for ${log.product_name || 'Unknown Product'}${log.batch_number ? ` (Batch: ${log.batch_number})` : ''}`,
  },
};