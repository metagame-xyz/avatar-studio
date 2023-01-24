import Image from 'next/image'

type IconProps = {
    image: string
    size?: 0 | 1 | 2 | 3
    className?: string
}

const iconSize = ['h-3 w-3', 'h-4 w-4', 'h-5 w-5', 'h-6 w-6']

const Icon = ({ image, size = 2, className = '' }: IconProps) => (
    <div className={`${className ? className : null} ${iconSize[size]}`}>
        <Image alt={image} src={image} height={300} width={300} />
    </div>
)

export default Icon
