// ================================================
// =================Front-End======================
// ================================================

// =================
// Main component
// =================
import { useGoogleOAuth } from '@react-oauth/google';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { authBySeznam } from '../../redux/auth/operations';
import { nanoid } from '@reduxjs/toolkit';

const Main = () => {
  const [searchParams, setSearchParams] = useParams();
  const { isLoading, user } = useGoogleOAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  useEffect(() => {
    const { origin } = new URL(window.location.href);
    const state = searchParams.get('state');

    code &&
      state === localStorage.getItem('requestSecretSeznam') &&
      dispatch(
        authBySeznam({
          code: code,
          redirect_uri: origin,
        })
      );

    code && user && navigate('/my-account/profile', { replace: true });
  }, [code, dispatch, navigate, searchParams, setSearchParams, user]);

  const requestSecretSeznam = nanoid();
  localStorage.setItem('requestSecretSeznam', requestSecretSeznam);
  const { origin } = new URL(window.location.href);

  return isLoading ? (
    <p>loading...</p>
  ) : (
    <NavLink
      href={`https://login.szn.cz/api/v1/oauth/auth
      ?client_id=${process.env.REACT_APP_SEZNAM_CLIENT_ID}
      &scope=identity
      &response_type=code
      &redirect_uri=${origin}
      &state=${requestSecretSeznam}`}
    >
      <StyledSeznamWrap>
        <IconSeznamLogoEskoCervena />
      </StyledSeznamWrap>
    </NavLink>
  );
};

export default Main;


// =================
// fetch authBySeznam
// =================

/*
 * POST https://login.szn.cz/api/v1/oauth/token
 * body: { code, redirect_uri }
 */
export const authBySeznam = createAsyncThunk(
  'auth/authBySeznam',
  async (credentials, thunkAPI) => {
    try {
      const res = await axios.post('api/users/authBySeznam', credentials);

      // After successful registration, add the token to the HTTP header
      setAuthHeader(res.data.token);

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue({
        status: error.response.status,
        message: error.response.data.message,
      });
    }
  }
);


// ================================================
// =================Back-End=======================
// ================================================

// =======================
// controlers authBySeznam
// =======================

const { default: axios } = require('axios');
const { User } = require('../../models');
const jwt = require('jsonwebtoken');

const { SECRET_KEY, SEZNAM_CLIENT_SECRET, SEZNAM_CLIENT_ID } = process.env;

const authBySeznam = async (req, res) => {
  // eslint-disable-next-line camelcase
  const { code, redirect_uri } = req.body;

  const resSeznam = await axios.post(
    'https://login.szn.cz/api/v1/oauth/token',
    {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri,
      client_secret: SEZNAM_CLIENT_SECRET,
      client_id: SEZNAM_CLIENT_ID,
    }
  );

  const { account_name: email } = resSeznam.data;

  let dataUser = await User.findOne({ email });
  if (!dataUser) {
    await User.create({
      email,
      provider: 'seznam',
    });

    dataUser = User.findOne({ email });
  }

  const payload = {
    id: dataUser._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '23h' });

  await User.findByIdAndUpdate(dataUser._id, { token });

  const { createdAt, updatedAt, token: _, ...user } = dataUser._doc;

  res.status(201).json({
    user,
    token,
  });
};

module.exports = authBySeznam;
