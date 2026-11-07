public class ConnectEightDigitsTests
{
    [Fact(DisplayName = "接続 8文字の数字")]
    public void ConnectEightDigits()
    {
        Assert.Equal(true, Answers.ConnectEightDigits("20260903"));
        Assert.Equal(false, Answers.ConnectEightDigits(""));
        Assert.Equal(false, Answers.ConnectEightDigits("1234567a"));
        Assert.Equal(false, Answers.ConnectEightDigits("1234567"));
        Assert.Equal(true, Answers.ConnectEightDigits("00000000"));
    }
}
