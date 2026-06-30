const handleError = (set,error) => {
    console.error(error);
    set.status = 500;
    return error
}