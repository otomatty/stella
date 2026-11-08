public class Q25Middle2Tests
{
    [Fact(DisplayName = "Q25 真ん中2文字")]
    public void Q25Middle2()
    {
        Assert.Equal("cd", Answers.Q25Middle2("abcdef"));
        Assert.Equal("34", Answers.Q25Middle2("123456"));
    }
}
