// Where the admin products list was (tab, search, scroll) when a product was
// opened for editing — saving the edit lands back on the same row instead of
// the top of the list.
export type ListPosition = { active: string; q: string; y: number };

let last: ListPosition | null = null;
let restore = false;

export const rememberListPosition = (p: ListPosition) => { last = p; };

/** Called on save: the next time the list opens, it goes back to `last`. */
export const returnToListPosition = () => { restore = true; };

export const pendingListPosition = (): ListPosition | null => (restore ? last : null);

export const clearListPosition = () => { restore = false; };
