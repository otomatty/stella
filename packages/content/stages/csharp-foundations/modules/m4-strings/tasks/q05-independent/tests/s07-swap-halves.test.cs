public class S07SwapHalvesTests
{
    [Fact(DisplayName = "S07 前後を交換")]
    public void S07SwapHalves()
    {
        Assert.Equal("cdab", Answers.S07SwapHalves("abcd"));
        Assert.Equal("1200", Answers.S07SwapHalves("0012"));
        Assert.Equal("YZWX", Answers.S07SwapHalves("WXYZ"));
    }
}
