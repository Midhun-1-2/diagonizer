import { Banknote, CreditCard, Landmark, Smartphone, Split, type LucideIcon } from 'lucide-react'
import type { InvoiceMethod } from '../../types'

export const METHOD_ICON: Record<InvoiceMethod, LucideIcon> = { Cash: Banknote, UPI: Smartphone, Card: CreditCard, 'Bank Transfer': Landmark, Split }
