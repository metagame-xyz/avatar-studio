import { keyframes } from '@stitches/react'
import { toast, ToastBar, Toaster as HotToaster } from 'react-hot-toast'

const start = `translateX(calc(100% + 24px))`
const end = 'translateX(0)'

const slideIn = keyframes({ from: { transform: start }, to: { transform: end } })

const swipeOut = keyframes({ from: { transform: end }, to: { transform: start } })

export const Toaster = () => (
    <HotToaster
        position="top-right"
        toastOptions={{
            iconTheme: {
                primary: '#4db6ac', // teal-300
                secondary: '#e0f2f1', // teal-50
            },
            duration: 4000,
            style: {
                background: '#2D3836', // Dark-accent from figma
                color: '#e0f2f1', // teal-50
                border: '1px solid #80cbc4', // teal-200
                padding: '1rem',
            },
        }}
    >
        {(t) => {
            switch (t.type) {
                case 'error':
                    t.iconTheme = {
                        primary: '#e57373', // red-300
                        secondary: '#ffebee', // red-50
                    }
                    t.style = {
                        ...t.style,
                        background: '#7C3A3A', // Dark-accent from figma
                        color: '#ffebee',
                        border: '1px solid #ef9a9a', // red-300
                    }
                // case 'loading':
                default:
                    break
            }

            return (
                <ToastBar
                    toast={t}
                    style={{
                        ...t.style,
                        animation: t.visible
                            ? `${slideIn} 200ms cubic-bezier(0.16, 1, 0.3, 1)`
                            : `${swipeOut} 100ms ease-out forwards`,
                    }}
                />
            )
        }}
    </HotToaster>
)

export const customToast = () => toast
