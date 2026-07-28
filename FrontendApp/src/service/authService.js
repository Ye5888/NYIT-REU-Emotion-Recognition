import { APIURL } from "@/constants/endpoint";

export const loginUser = async ({username, password}) => {

    try{

        const response = await fetch(`${APIURL}/login`,{
            method:"POST",
            headers:{
            'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                username: username,
                password: password
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

export const signUpUser = async ({username, password}) => {

    try{

        const response = await fetch(`${APIURL}/signup`,{
            method:"POST",
            headers:{
            'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                username: username,
                password: password
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

export const updateUser = async ({userId, preferences}) => {

    try{

        const response = await fetch(`${APIURL}/users/${userId}`,{
            method:"PUT",
            headers:{
            'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                preferences
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