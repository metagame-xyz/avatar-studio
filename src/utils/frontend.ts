export const classNamesFn = (...classes: string[]) => {
    return classes.filter(Boolean).join(' ')
}
