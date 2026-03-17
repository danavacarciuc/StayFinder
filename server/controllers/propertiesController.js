const Property = require('../models/Property');

exports.getAll = async (req, res) => {
    const properties = await Property.find();
    res.json(properties);
};