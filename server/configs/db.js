import mongoose from 'mongoose';

const connectDB = async () =>{
    try {
        mongoose.connection.on('connected', ()=> {});
        await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`)
    } catch (error) {
        
    }
}

export default connectDB;