public class CheckATail2Tests
{
    [Fact(DisplayName = "確認A 末尾2文字")]
    public void CheckATail2()
    {
        Assert.Equal("12", Answers.CheckATail2("0012"));
        Assert.Equal("Err", Answers.CheckATail2("12"));
        Assert.Equal("Err", Answers.CheckATail2("0a12"));
        Assert.Equal("Err", Answers.CheckATail2(""));
        Assert.Equal("00", Answers.CheckATail2("000"));
    }
}
