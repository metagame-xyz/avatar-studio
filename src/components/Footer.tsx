import Image from 'next/image'

const Footer = () => {
    return (
        <footer className="py-4 text-white">
            <div className="container mx-auto flex items-center justify-between px-4">
                <div className="flex gap-3">
                    <Image src="/logo.png" alt="Logo" className="" width={24} height={24} />
                    <div className="text-sm">Metagame</div>
                </div>
                <div className=""></div>
                <div className="text-sm">
                    <a href="#about" className="px-2">
                        About
                    </a>
                    <a href="#twitter" className="px-2">
                        Twitter
                    </a>
                </div>
            </div>
        </footer>
    )
}

export default Footer
