const response = await fetch("http://localhost:5000/users/pbztqzxLY72V7af0f72I", {
    method: 'DELETE', // Specify the HTTP method
    headers: {
    'Content-Type': 'application/json' // Tell the server you are sending JSON
    },
    body: JSON.stringify(    ) // Convert the JS object into a JSON string
});

// Fetch only rejects on network failures. Always check response.ok!
if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
}

const data = await response.json(); // Parse the response body as JSON
console.log('Success:', data);