import { useEffect, useState } from "react";
import { getLoggedinUser } from "../../api";

const useProfile = () => {
  const userProfileSession = getLoggedinUser();
  const [loading, setLoading] = useState(userProfileSession ? false : true);
  const [userProfile, setUserProfile] = useState(
    userProfileSession ? userProfileSession : null
  );

  useEffect(() => {
    const userProfileSession = getLoggedinUser();
    setUserProfile(userProfileSession ? userProfileSession : null);
    setLoading(false);
  }, []);

  return { userProfile, loading };
};

export { useProfile };