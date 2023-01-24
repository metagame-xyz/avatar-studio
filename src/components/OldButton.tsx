import { classNamesFn } from 'utils'

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

const OldButton = ({
    text,
    onClick,
    type,
    classNames,
}: {
    text: string
    onClick: () => unknown
    type: ButtonType
    classNames: string
}) => {
    return (
        <button
            type="button"
            className={classNamesFn(ButtonTypeClass[type], classNames)}
            onClick={onClick}
        >
            {text}
        </button>
    )
}

OldButton.defaultProps = {
    type: ButtonType.Primary,
    classNames: '',
}

export default OldButton
