import { API_BASE } from '@/experiment/api';

export const loginUser = async (user) => {
    const API_URL = API_BASE;

    try{
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