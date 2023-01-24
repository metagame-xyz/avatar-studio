import { motion } from 'framer-motion'

const loadingContainerVariants = {
    start: {
        transition: {
            staggerChildren: 0.2,
        },
    },
    end: {
        transition: {
            staggerChildren: 0.2,
        },
    },
}

const loadingCircleVariants = {
    start: {
        y: '0%',
    },
    end: {
        y: '-10%',
    },
}

const loadingCircleTransition = {
    duration: 0.5,
    yoyo: Infinity,
    ease: 'easeInOut',
}

const ThreeDotsWave = () => {
    return (
        <motion.div className="flex" variants={loadingContainerVariants} initial="start" animate="end">
            <motion.span variants={loadingCircleVariants} transition={loadingCircleTransition}>
                .
            </motion.span>
            <motion.span variants={loadingCircleVariants} transition={loadingCircleTransition}>
                .
            </motion.span>
            <motion.span variants={loadingCircleVariants} transition={loadingCircleTransition}>
                .
            </motion.span>
        </motion.div>
    )
}

export default ThreeDotsWave
