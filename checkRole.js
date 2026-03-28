module.exports = function checkRole(member, roleId) {
    if (!member || !member.roles) return false;
    return member.roles.cache.has(roleId);
};
