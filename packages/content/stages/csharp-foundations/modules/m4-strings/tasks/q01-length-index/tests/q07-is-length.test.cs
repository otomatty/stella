public class Q07IsLengthTests
{
    [Fact(DisplayName = "Q07 長さが N か")]
    public void Q07IsLength()
    {
        Assert.Equal(true, Answers.Q07IsLength("abc", 3));
        Assert.Equal(false, Answers.Q07IsLength("abc", 2));
        Assert.Equal(true, Answers.Q07IsLength("", 0));
    }
}
