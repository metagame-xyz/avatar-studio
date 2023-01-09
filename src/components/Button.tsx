// const Button = ({ text, onClick }: { text: string; onClick: () => any }) => {
//     return (
//         <button
//             type="button"
//             className="inline-flex items-center rounded-md border border-transparent bg-teal-100 px-4 py-2 text-base font-medium text-black hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
//             onClick={onClick}
//         >
//             {text}
//         </button>
//     )
// }

export const enum ButtonType {
    Primary = 'primary',
    Secondary = 'secondary',
    // Tertiary = 'tertiary',
}

const ButtonTypeClass = {
    primary:
        'inline-flex items-center rounded-md border border-transparent bg-teal-300 px-4 py-2 text-base font-medium text-black  shadow-sm hover:bg-teal-400 focus:outline-none focus:ring-1 focus:ring-black focus:ring-offset-1',
    secondary:
        'inline-flex items-center rounded-md border border-transparent bg-[#2D3836] px-4 py-2 text-base font-medium text-teal-50 hover:bg-[#1B2221] focus:outline-none focus:ring-1 focus:ring-teal-50 focus:ring-offset-1',
}

const Button = ({
    text,
    onClick,
    type,
}: {
    text: string
    onClick: () => unknown
    type: ButtonType
}) => {
    return (
        <button
            type="button"
            className={ButtonTypeClass[type]}
            onClick={onClick}
        >
            {text}
        </button>
    )
}

Button.defaultProps = {
    type: ButtonType.Primary,
}

export default Button
