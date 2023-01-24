type TitleProps = {
    level?: 1 | 2 | 3 | 4 | 5 | 6
    weight?: 'medium' | 'bold'
    children: React.ReactNode
    className?: string
}

const textSize = [
    'text-7xl',
    'text-6xl',
    'text-5xl',
    'text-4xl',
    'text-3xl',
    'text-2xl',
    'text-xl',
    'text-lg',
]

const xsTextSize = [
    'xs:text-7xl',
    'xs:text-6xl',
    'xs:text-5xl',
    'xs:text-4xl',
    'xs:text-3xl',
    'xs:text-2xl',
    'xs:text-xl',
    'xs:text-lg',
]

const Title: React.FunctionComponent<TitleProps> = ({
    level = 3,
    children,
    className,
    weight = 'medium',
}) => {
    const Heading = `h${level}` as const
    // avoiding string concatenation to create class names because of tailwind optimization
    return (
        <Heading
            className={`font-heading font-${weight} text-white ${
                textSize[level + 1]
            } ${xsTextSize[level + 1]} ${className ? className + ' ' : ''}`}
        >
            {children}
        </Heading>
    )
}

export default Title
