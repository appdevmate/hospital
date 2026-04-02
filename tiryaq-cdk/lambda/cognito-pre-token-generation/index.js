exports.handler = async (event) => {
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