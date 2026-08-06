
export const loginUser = async (user) => {

    try{

        const API_URL = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:5000';

        const response = await fetch(`${API_URL}/login`, {
            method:"POST",
            headers:{
            'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                username: user.username,
                password: user.password
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Success:', result);

        return result;

    } catch (error) {
        console.error('Error posting data:', error);
    }

}