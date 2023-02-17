import Image from 'next/image'

const Footer = () => {
    return (
        <footer className="border-t border-slate-800 py-4 text-white">
            <div className="container mx-auto flex items-center justify-between px-4">
                <div className="flex gap-4">
                    <Image src="/logo.png" alt="Logo" className="" width={24} height={24} />
                    <div className="text-sm">Metagame</div>
                </div>
                <div className=""></div>
                <div className="flex gap-4 text-sm">
                    <a href="#about">About</a>
                    <a href="#twitter">Twitter</a>
                </div>
            </div>
        </footer>
    )
}

export default Footer
