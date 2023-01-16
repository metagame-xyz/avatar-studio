import slugifyFn from 'slugify'

export const classNamesFn = (...classes: string[]) => {
    return classes.filter(Boolean).join(' ')
}

export const slugify = (name: string) => {
    return slugifyFn(name, {
        lower: true,
        strict: true,
        locale: 'en',
    })
}

// export const getKeys = <T>(obj: Record<string, T>) =>
//     Object.keys(obj) as Array<keyof T>

// export const getEntries = <T>(obj: Record<string, T>) =>
//     Object.entries(obj) as Array<[string, T]>

// export const getValues = <T>(obj: Record<string, T>) =>
//     Object.values(obj) as Array<T>
