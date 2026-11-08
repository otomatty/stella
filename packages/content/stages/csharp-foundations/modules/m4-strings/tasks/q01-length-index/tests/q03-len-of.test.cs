public class Q03LenOfTests
{
    [Fact(DisplayName = "Q03 長さだけ")]
    public void Q03LenOf()
    {
        Assert.Equal(3, Answers.Q03LenOf("abc"));
        Assert.Equal(0, Answers.Q03LenOf(""));
        Assert.Equal(5, Answers.Q03LenOf("12345"));
    }
}
