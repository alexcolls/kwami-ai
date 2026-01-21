// Vite raw imports for HTML templates
declare module '*.html?raw' {
  const content: string
  export default content
}

// Iconify Icon web component declaration
declare namespace JSX {
  interface IntrinsicElements {
    'iconify-icon': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        icon?: string
        width?: string | number
        height?: string | number
        inline?: boolean
        mode?: 'svg' | 'style' | 'mask'
        flip?: 'horizontal' | 'vertical' | 'horizontal,vertical'
        rotate?: number | string
      },
      HTMLElement
    >
  }
}

// For vanilla TS usage
interface HTMLElementTagNameMap {
  'iconify-icon': HTMLElement & {
    icon: string
    width?: string | number
    height?: string | number
  }
}
