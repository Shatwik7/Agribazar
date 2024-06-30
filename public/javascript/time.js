function getTimeDifference(mysqlTimeString) {
    // Parse MySQL time string into a Date object
    const mysqlTime = new Date(mysqlTimeString);

    // Get current time
    const currentTime = new Date();

    // Calculate the difference in milliseconds
    const timeDifference = currentTime - mysqlTime;

    // Convert milliseconds to minutes, hours, days, and months
    const minutesDifference = Math.floor(timeDifference / (1000 * 60));
    const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const monthsDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24 * 30));

    if(monthsDifference!=0){
        return `${monthsDifference} months ago`;
    }
    else if(daysDifference!=0){
        return `${daysDifference} days ago`;
    }
    else if(hoursDifference!=0){
        return`${hoursDifference} hr ago`;
    }
    else{
        return`${minutesDifference} min ago`;
    }
}

