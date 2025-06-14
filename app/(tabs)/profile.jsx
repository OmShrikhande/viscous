import { View, Text } from 'react-native'
import React from 'react'

import MenuList from '../../components/Profile/MenuList'

export default function profile() {
  return (
    <View style={{
      padding:20,
    }}>
      <Text style={{
        fontFamily:'flux-bold',
        fontSize:35,            
       
      }}>Profile</Text>


      {/* UsserIntro */}

      {/* <UserIntro/> */}

      {/* userList */}

      <MenuList/>

    </View>
  )
}