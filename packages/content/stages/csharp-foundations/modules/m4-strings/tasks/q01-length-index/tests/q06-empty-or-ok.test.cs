public class Q06EmptyOrOkTests
{
    [Fact(DisplayName = "Q06 空文字か")]
    public void Q06EmptyOrOk()
    {
        Assert.Equal("empty", Answers.Q06EmptyOrOk(""));
        Assert.Equal("ok", Answers.Q06EmptyOrOk("a"));
        Assert.Equal("ok", Answers.Q06EmptyOrOk(" "));
    }
}
