
export const loginUser = async (user) => {

    try{

        const response = await fetch("http://localhost:5000/login",{
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