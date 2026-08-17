type IdFilter = { id?: string };

export function ownedClientWhere(userId: string, filter: IdFilter = {}) {
  return {
    ...filter,
    userId,
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
