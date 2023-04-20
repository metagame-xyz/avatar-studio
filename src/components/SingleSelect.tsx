import { slugify } from 'utils'

type SelectOption = {
    id: string
    name: string
}

type SelectProps = {
    label: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    value: string
    options: SelectOption[]
    placeholder?: string
    className?: string
}

const SingleSelect = ({ label, onChange, value, options, placeholder = 'Select', className = '' }: SelectProps) => {
    const slug = slugify(label)
    return (
        <div
            className={`relative w-32 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600 ${className}`}
        >
            <label
                htmlFor={slug}
                className="absolute -top-2 left-2 -mt-px inline-block bg-black px-1 text-xs font-medium"
            >
                {label}
            </label>
            <select
                name={slug}
                id={slug}
                className="block w-full border-0 bg-black p-0 text-teal-50 placeholder-gray-500 focus:ring-0 sm:text-sm"
                value={value}
                onChange={onChange}
            >
                <option value="" disabled hidden>
                    {placeholder}
                </option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default SingleSelect
