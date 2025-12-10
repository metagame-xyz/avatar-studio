import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useDemoContext } from 'contexts/DemoContext'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { defaultConfig } from 'pages/_app'
import { Fragment, useEffect, useState } from 'react'
import type { SubdomainConfig } from 'utils/types'
import { DEMO_PROJECT_SLUG } from 'utils/demo/constants'

const navigation = [
    { name: 'Help', href: 'https://t.me/brennerspear', current: false, external: true },
]

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export default function Navbar({ subdomainConfig = defaultConfig }: { subdomainConfig?: SubdomainConfig }) {
    const router = useRouter()
    const { user, isLoggedIn, logout: demoLogout, clearAllData } = useDemoContext()

    const displayName = user?.displayName || 'Demo User'

    const [mounted, setMounted] = useState(false)

    const logout = () => {
        demoLogout()
        router.push('/')
    }

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true)
    }, [])

    // console.log('mounted', mounted)
    // console.log('address', address)
    // console.log('isConnected', isConnected)
    // console.log('isConnecting', isConnecting)
    // console.log('ensAvatarUrl', ensAvatarUrl?.length)

    return (
        <Disclosure as="nav" className={`bg-black ${subdomainConfig.font}`}>
            {({ open }) => (
                <>
                    <div className="container mx-auto">
                        <div className="relative mx-4 flex h-16 items-center justify-between">
                            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                                {/* Mobile menu button*/}
                                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                                    <span className="sr-only">Open main menu</span>
                                    {open ? (
                                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                                    ) : (
                                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                                    )}
                                </Disclosure.Button>
                            </div>
                            <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                                <div className="flex flex-shrink-0 items-center">
                                    <div className="block h-8 w-auto">
                                        <Link href={isLoggedIn ? `/project/${DEMO_PROJECT_SLUG}` : '/'}>
                                            <div className={`relative block ${subdomainConfig.logoSize}`}>
                                                <Image
                                                    src={subdomainConfig.logoSrc}
                                                    alt={subdomainConfig.logoAlt}
                                                    fill
                                                    // width={32}
                                                    // height={32}
                                                />
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                                {/* <div className="hidden sm:ml-6 sm:block">
                                    <div className="flex space-x-4">
                                        {navigation.map((item) => (
                                            <a
                                                key={item.name}
                                                href={item.href}
                                                className={classNames(
                                                    item.current
                                                        ? 'bg-gray-900 text-white'
                                                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                                                    'rounded-md px-3 py-2 text-sm font-medium',
                                                )}
                                                aria-current={
                                                    item.current
                                                        ? 'page'
                                                        : undefined
                                                }
                                            >
                                                {item.name}
                                            </a>
                                        ))}
                                    </div>
                                </div> */}
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center gap-4 sm:static sm:inset-auto">
                                <div className="hidden text-sm text-teal-300 hover:text-teal-100 sm:block">
                                    <Link href={'https://t.me/brennerspear'} target="_blank">
                                        Help
                                    </Link>
                                </div>
                                {/* <div className="hidden text-sm text-teal-300 hover:text-teal-100 sm:block">
                                    <Link href={'/about'}>About</Link>
                                </div> */}
                                {/* <button
                                    type="button"
                                    className="rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                                >
                                    <span className="sr-only">
                                        View notifications
                                    </span>
                                    <BellIcon
                                        className="h-6 w-6"
                                        aria-hidden="true"
                                    />
                                </button> */}
                                {/* Profile dropdown */}
                                {mounted && isLoggedIn ? (
                                    <Menu as="div" className="relative">
                                        <div>
                                            <Menu.Button className="flex rounded-full bg-black text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black">
                                                <span className="sr-only">Open user menu</span>
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white">
                                                    {displayName.charAt(0).toUpperCase()}
                                                </div>
                                            </Menu.Button>
                                        </div>

                                        <Transition
                                            as={Fragment}
                                            enter="transition ease-out duration-100"
                                            enterFrom="transform opacity-0 scale-95"
                                            enterTo="transform opacity-100 scale-100"
                                            leave="transition ease-in duration-75"
                                            leaveFrom="transform opacity-100 scale-100"
                                            leaveTo="transform opacity-0 scale-95"
                                        >
                                            <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <span
                                                            className={classNames(
                                                                active ? 'bg-gray-100' : '',
                                                                'block px-4 py-2 text-sm text-gray-700',
                                                            )}
                                                        >
                                                            {displayName}
                                                        </span>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            type="button"
                                                            className={classNames(
                                                                active ? 'bg-gray-100' : '',
                                                                'block w-full px-4 py-2 text-left text-sm text-gray-700',
                                                            )}
                                                            onClick={clearAllData}
                                                        >
                                                            Reset Demo Data
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                                <Menu.Item>
                                                    {({ active }) => (
                                                        <button
                                                            type="button"
                                                            className={classNames(
                                                                active ? 'bg-gray-100' : '',
                                                                'block w-full px-4 py-2 text-left text-sm text-gray-700',
                                                            )}
                                                            onClick={logout}
                                                        >
                                                            Log out
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                            </Menu.Items>
                                        </Transition>
                                    </Menu>
                                ) : (
                                    <div className="h-8 w-8"></div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Disclosure.Panel className="px-4 sm:hidden">
                        <div className="space-y-4 py-4">
                            {navigation.map((item) => (
                                <Disclosure.Button
                                    key={item.name}
                                    as="a"
                                    href={item.href}
                                    className={classNames(
                                        item.current
                                            ? 'bg-gray-900 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                                        'block rounded-md pl-2 text-base font-medium',
                                    )}
                                    aria-current={item.current ? 'page' : undefined}
                                    target={item.external ? '_blank' : undefined}
                                >
                                    {item.name}
                                </Disclosure.Button>
                            ))}
                        </div>
                    </Disclosure.Panel>
                </>
            )}
        </Disclosure>
    )
}
