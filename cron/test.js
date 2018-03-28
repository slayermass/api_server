function getPromise(val, err) {
    return new Promise(function (resolve, reject) {
        if (err) reject(err);
        setTimeout(() => resolve(val), val * 1000);
    });
}

const makeRequest = async () => {
    console.log(await getPromise(1));
    return "done"
};

makeRequest();
