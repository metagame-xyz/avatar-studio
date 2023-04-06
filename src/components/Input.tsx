import { slugify } from 'utils'

type InputProps = {
    label: string
    placeholder?: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    type?: string
    className?: string
}

const Input = ({ label, placeholder, value, onChange, type = 'text', className = '' }: InputProps) => {
    const slug = slugify(label)
    return (
        <div
            className={`relative rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600 ${className}`}
        >
            <label
                htmlFor={slug}
                className="absolute -top-2 left-2 -mt-px inline-block bg-black  px-1 text-xs font-medium"
            >
                {label}
            </label>
            <input
                type={type}
                name={slug}
                id={slug}
                className="block w-full border-0 bg-black p-0 text-teal-50 placeholder-gray-500 focus:ring-0 sm:text-sm"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
        </div>
    )
}

export default Input
