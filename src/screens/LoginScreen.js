import React, { useState,useEffect } from 'react'
import { TouchableOpacity, StyleSheet, View, Alert ,Modal, ActivityIndicator} from 'react-native'
import { Text } from 'react-native-paper'
import Background from '../components/Background'
import Logo from '../components/Logo'
import Button from '../components/Button'
import TextInput from '../components/TextInput'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { theme } from '../core/theme'
import { nameValidator } from '../helpers/nameValidator'
import { passwordValidator } from '../helpers/passwordValidator'
import getEnvVars from './environment';
const { uiversion } = getEnvVars();
import { AuthContext } from "./context";
import { createStackNavigator } from '@react-navigation/stack';
const Stack = createStackNavigator();

const LoginScreen = ({ navigation }) => 
{
  let [email, setEmail] = useState({ value: '', error: '' })
  let [password, setPassword] = useState({ value: '', error: '' })
  const [version,setversion]=useState('');
  const [apiUrl,setapiUrl]=useState('');
  const { checkusertype,initializeusertype } = React.useContext(AuthContext);
  
  //This function is used to fetch and update the values before execute other function
  useEffect(() => {
    let sampleurl=JSON.stringify(window.location.href)
    let geturl=sampleurl.split('/')
    setapiUrl("https://www.cornellsaprun.com/dncserver/")
    getApiversion("https://www.cornellsaprun.com/dncserver/");
    initializeusertype();
  }, [])
  
  //To get the api token
  const getApiversion = (apiUrl) => {
    const url = apiUrl+"/version"
    const postMethod= {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      
    }
    fetch(url,postMethod)
    .then(response => {
      const statusCode = response.status
      if (statusCode == 502) {
        alert('Please turn on server')
      }
      response.json().then(responseJson => {
        if(responseJson!=null){
        let versionarray=responseJson.split(' ');
        setversion(versionarray[4])
        }
        
      })
    })
    .catch(error => {
        console.error(error)
    })
  }
  
  //To verify the login authentication
  const onLoginPressed = () => {
    const emailError = nameValidator(email.value)
    const passwordError = passwordValidator(password.value)
    if (emailError || passwordError) {
      setEmail({ ...email, error: emailError })
      setPassword({ ...password, error: passwordError })
      return
    }
    var data = {
      uname: email.value,
      pwd: password.value,
    }
    const storeData = async (taken, uname, usertype) => {
      try {
        const tokenValue = JSON.stringify(taken)
        const unameValue = JSON.stringify(uname)
        
        await AsyncStorage.setItem('token', tokenValue)
        await AsyncStorage.setItem('uname', unameValue)
        await AsyncStorage.setItem('usertype', usertype)
        await AsyncStorage.setItem('apiUrl', apiUrl)
      } catch (e) {
        console.log(e)
      }
    }
    const url = apiUrl+"/login";
    const postMethod= {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
   
    fetch(url,postMethod)
    .then(response => {
        const statusCode = response.status
        if (statusCode == 403) {
          alert('inavalid token/token expired')
        }
        if (statusCode == 502) {
          alert('Please turn on server')
        }
        response.json().then(responseJson => {
          let usertype = ''
          const result = 'Invalid username/password'
          if (responseJson.message == result ||responseJson.message=='User not exists') {
            navigation.reset({
              index: 0,
              routes: [{ name: 'LoginScreen' }],
            })
            alert(result)
          } 
          else {
            const token = responseJson['token']
            const uname = email.value
            const level = responseJson['level']
            if (level == "1") {
              usertype = 'Client'
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              })
              checkusertype()
            } else {
             
              usertype = 'Admin'
          
              navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
              })
            }

            storeData(token, uname, usertype)
          }
        })
      })
      .catch(error => {
        console.error(error)
      })
  }
  
  //To get type user need to signup
  const onSignupPressed = () => {
   
    const url = apiUrl+"/signup";
    fetch(url, {
      method: 'GET',
      headers: {
       
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      
        
    })
  

    .then(response => response.json())
    .then(responseJson => {
      const result = "Welcome Admin"
      if (responseJson["message"] == result) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'AdminSignup' }],
          })
      } else if(responseJson["message"]="Welcome User") {
        navigation.reset({
            index: 0,
            routes: [{ name: 'UserSignup' }],
          })
        }
      else{
          alert(JSON.stringify(responseJson["message"]));
        }
      })
    .catch(error => {
        console.error(error)
    })
  }
  const handleKeyDown=(e) =>  {
    if(e.nativeEvent.key == "Enter"){
      onLoginPressed();
    }
}


return (
<Background>
  <View style={{
    flex: 1,
    flexDirection: "row",
    paddingTop: 30}}>
      <View style={{
        flex: 1,
        flexDirection: "column"}}>
          
          <View style={{
            flex: 0.1,
            flexDirection: "row"}}>
              <View style={styles.DataDownload}>
                <TouchableOpacity onPress={() => navigation.navigate('DataDownload')}>
                  <Text style={styles.DataDownload}>Data download</Text>
                  </TouchableOpacity>
                  </View>
                  </View>
                  
                  <View style={{
                    flex: 1,
                    flexDirection: "column",
                    paddingTop: 30}}>
                  
                  <Logo/>
                  
        <TextInput
        label="User name"
        returnKeyType="next"
        value={email.value}
        onChangeText={(text) => setEmail({ value: text, error: '' })}
        error={!!email.error}
        errorText={email.error}
        autoCapitalize="none"s
        autoCompleteType="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        />

        <TextInput
        label="Password"
        returnKeyType="done"
        value={password.value}
        onChangeText={text => setPassword({ value: text, error: '' })}
        error={!!password.error}
        errorText={password.error}
        secureTextEntry={true}
        onKeyPress={e=>handleKeyDown(e)}
        />
        
        <View style={styles.forgotPassword}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPasswordScreen')}>
            <Text style={styles.forgot}>Forgot your password?</Text>
          </TouchableOpacity>
        </View>
        
        <Button mode="contained" onPress={onLoginPressed}>Login</Button>

        <View style={styles.row}>
          <Text style={{color:'white'}}>Don’t have an account? </Text>
          <TouchableOpacity onPress={onSignupPressed}>
            <Text style={styles.link}>Sign up</Text>
          </TouchableOpacity>
        </View>

        <View style={{position: 'absolute', bottom: 10, marginHorizontal: 'auto'}}>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>DNC | {uiversion}| Server {version}</Text>
        </View>

      </View>      
    </View>
  </View>
</Background>

)}

const styles = StyleSheet.create({
  forgotPassword: {
    width:'100%',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
    DataDownload: {
    flex: 1,
    alignItems:'flex-end',
    alignContent: 'flex-end',
    color: 'white', 
    fontSize: 20, 
    fontWeight: 'bold',
    },
  row: {
    flexDirection: 'column',
    marginTop: 4,
  },
  forgot: {
    fontSize: 13,
    color: theme.colors.third,
  },
  link: {
    fontWeight: 'bold',
    color: theme.colors.third,
  },
})
export default LoginScreen