const [searchParams, setSearchParams] = useSearchParams(); //required 

  const removeParam = param => {
    setSearchParams(pref => {
      const params = new URLSearchParams(pref);
      params.delete(param);
      return params;
    });
  };
