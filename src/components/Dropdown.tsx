import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { Fragment } from 'react'

function classNames(...classes: (string | boolean)[]) {
    return classes.filter(Boolean).join(' ')
}

type DropdownProps<T extends { id: number | string; name: string }> = {
    selected: T | null
    setSelected: (item: T | null) => void
    label: string
    items: T[]
}

export default function Dropdown<T extends { id: number | string; name: string }>({
    selected,
    setSelected,
    label,
    items,
}: DropdownProps<T>) {
    return (
        <Listbox value={selected} onChange={setSelected}>
            {({ open }) => (
                <>
                    <div className="relative mt-3">
                        <Listbox.Label className="absolute -top-2 left-2 z-10 -mt-px inline-block bg-black px-1 text-xs font-medium">
                            {label}
                        </Listbox.Label>
                        <Listbox.Button className="relative min-h-[38px] w-full cursor-default rounded-md border border-gray-300 bg-black py-2 pl-3 pr-10 text-left shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 sm:text-sm">
                            <span className="block truncate">{selected?.name}</span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                        </Listbox.Button>

                        <Transition
                            show={open}
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-black py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                {items.map((item) => (
                                    <Listbox.Option
                                        key={item.id}
                                        className={({ active }) =>
                                            classNames(
                                                active ? 'bg-teal-600 text-teal-50' : 'text-gray-300',
                                                'relative cursor-default select-none py-2 pl-3 pr-9',
                                            )
                                        }
                                        value={item}
                                    >
                                        {({ selected, active }) => (
                                            <>
                                                <span
                                                    className={classNames(
                                                        selected ? 'font-semibold' : 'font-normal',
                                                        'block truncate',
                                                    )}
                                                >
                                                    {item.name}
                                                </span>

                                                {selected ? (
                                                    <span
                                                        className={classNames(
                                                            active ? 'text-white' : 'text-teal-600',
                                                            'absolute inset-y-0 right-0 flex items-center pr-4',
                                                        )}
                                                    >
                                                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                    </Listbox.Option>
                                ))}
                            </Listbox.Options>
                        </Transition>
                    </div>
                </>
            )}
        </Listbox>
    )
}
