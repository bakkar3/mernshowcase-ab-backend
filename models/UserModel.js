import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
	firstName: {'type': String, "required": true},
	lastName: {'type': String, "required": true},
	login: {'type': String, "required": true},
	email: {'type': String, "required": true},
	hash: { 'type': String, "required": true},
	accessGroups: {'type': String, "required": true},
}, 
{
	timestamps: true,
	versionKey: false,
	collection: "users"
})

const UserModel = mongoose.model('User', UserSchema);

export default UserModel;