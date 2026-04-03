import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:border-[var(--docs-input)] focus-visible:ring-[3px] focus-visible:ring-[var(--docs-ring)] aria-invalid:ring-[var(--docs-destructive)]/20 dark:aria-invalid:ring-[var(--docs-destructive)]/40 aria-invalid:border-[var(--docs-destructive)]',
  {
    variants: {
      variant: {
        default: 'bg-[var(--docs-primary)] text-[var(--docs-primary-foreground)] shadow-xs hover:bg-[color-mix(in_oklab,var(--docs-primary)_92%,black)]',
        outline: 'border border-[var(--docs-border)] bg-[var(--docs-card)] shadow-xs hover:bg-[var(--docs-accent)] hover:text-[var(--docs-accent-foreground)]',
        secondary: 'bg-[var(--docs-secondary)] text-[var(--docs-secondary-foreground)] shadow-xs hover:bg-[color-mix(in_oklab,var(--docs-secondary)_82%,black)]',
        ghost: 'hover:bg-[var(--docs-accent)] hover:text-[var(--docs-accent-foreground)]',
        link: 'text-[var(--docs-primary)] underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md gap-1.5 px-3',
        lg: 'h-10 rounded-md px-6',
        icon: 'size-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
