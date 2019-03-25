/*

  Copyright 2017 Loopring Project Ltd (Loopring Foundation).

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
pragma solidity 0.5.2;

import "../iface/IDEX.sol";
import "./exchange/Capability3StakeQuery.sol";


/// @title An Implementation of IDEX.
/// @author Brecht Devos - <brecht@loopring.org>
/// @author Daniel Wang  - <daniel@loopring.org>
contract DEX is IDEX, Capability3StakeQuery
{
    constructor(
        uint    _id,
        address _loopringAddress,
        address _owner,
        address _operator
        )
        public
    {
        require(0 != _id, "INVALID_ID");
        require(address(0) != _loopringAddress, "ZERO_ADDRESS");
        require(address(0) != _owner, "ZERO_ADDRESS");
        require(address(0) != _operator, "ZERO_ADDRESS");

        id = _id;
        loopringAddress = _loopringAddress;
        owner = _owner;
        operator = _operator;

        loopring = ILoopringV3(loopringAddress);

        registerToken(loopring.lrcAddress());
        registerToken(loopring.wethAddress());

        lrcAddress = loopring.lrcAddress();
    }
}