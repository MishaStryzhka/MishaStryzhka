const location = useLocation();

const removeParam = param => {
    const { pathname, search } = location;
    const params = new URLSearchParams(search);
    params.delete(param);
    return `${pathname}?${params.toString()}`;
  };
