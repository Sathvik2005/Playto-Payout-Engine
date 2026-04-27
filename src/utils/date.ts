import { format } from 'date-fns'

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy, hh:mm a')
}
