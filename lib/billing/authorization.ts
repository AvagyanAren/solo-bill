type IdFilter = { id?: string };

export function ownedClientWhere(userId: string, filter: IdFilter = {}) {
  return {
    ...filter,
    userId,
  };
}

/** Non-archived clients for lists and invoice assignment. */
export function activeClientWhere(userId: string, filter: IdFilter = {}) {
  return {
    ...ownedClientWhere(userId, filter),
    archivedAt: null,
  };
}

export function ownedInvoiceWhere(userId: string, filter: IdFilter = {}) {
  return {
    ...filter,
    userId,
  };
}

export function ownedInvoiceActivityWhere(userId: string, filter: IdFilter = {}) {
  return {
    ...filter,
    actorUserId: userId,
  };
}

export function ownedReminderRunWhere(userId: string, filter: IdFilter = {}) {
  return {
    ...filter,
    userId,
  };
}
