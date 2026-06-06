exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };
    event.response = {
        claimsAndScopeOverrideDetails: {
            accessTokenGeneration: {
                claimsToAddOrOverride: {
                    email: event.request.userAttributes.email || '',
                    name:  event.request.userAttributes.name  || ''
                }
            }
        }
    };
    return event;
};