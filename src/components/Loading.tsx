import Spinner from 'components/Spinner'

interface LoadingProps {
    loadingText?: string
}

const Loading: React.FC<LoadingProps> = ({ loadingText }) => {
    return (
        <>
            {loadingText ? (
                <div className="flex flex-col items-center gap-4">
                    <Spinner />
                    <div className="text-center text-xs text-teal-400"> {loadingText}</div>
                </div>
            ) : (
                <div className="flex justify-center p-2">
                    <Spinner />
                </div>
            )}
        </>
    )
}

export default Loading
