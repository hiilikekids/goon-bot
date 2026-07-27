module.exports = function checkRole(member, roleId) {
    if (!member) return false;
    if (!member.roles || !member.roles.cache) return false;

    return member.roles.cache.has(roleId);
};
